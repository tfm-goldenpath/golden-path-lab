"""Pure contracts for the bounded Java quality adapter; no execution on import."""
from decimal import Decimal
import math
import re
import xml.etree.ElementTree as ET

METRICS = {'lines': 'LINE', 'methods': 'METHOD', 'branches': 'BRANCH'}
COUNTERS = ('INSTRUCTION', 'BRANCH', 'LINE', 'COMPLEXITY', 'METHOD', 'CLASS')
POM_NS = 'http://maven.apache.org/POM/4.0.0'
DOCTYPE = '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">'


def keys(value, expected):
    if not isinstance(value, dict) or set(value) != set(expected):
        raise ValueError('Unknown or missing Java quality fields')


def validate_config(c):
    keys(c, ('schema', 'include', 'exclude', 'thresholds', 'limits'))
    if c['schema'] != 'java-quality-gate/v1':
        raise ValueError('Unsupported Java quality schema')
    for field in ('include', 'exclude'):
        entries = c[field]
        if not isinstance(entries, list) or len(entries) > 100 or any(not isinstance(n, str) for n in entries) or len(set(entries)) != len(entries):
            raise ValueError('Invalid Java scope: '+field)
        for name in entries:
            if not re.fullmatch(r'src/main/java/(?:[A-Za-z_][A-Za-z0-9_]*\/)*(?:[A-Za-z_][A-Za-z0-9_]*\.java)?', name):
                raise ValueError('Expected literal production Java file or directory: '+name)
    if not c['include']:
        raise ValueError('Empty production scope')
    keys(c['thresholds'], METRICS)
    for name, value in c['thresholds'].items():
        if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 100:
            raise ValueError('Invalid Java threshold: '+name)
    keys(c['limits'], ('timeoutSeconds', 'maxOutputBytes'))
    for name, lo, hi in [('timeoutSeconds', 1, 300), ('maxOutputBytes', 4096, 16777216)]:
        value = c['limits'][name]
        if type(value) is not int or not lo <= value <= hi:
            raise ValueError('Invalid Java operational limit: '+name)
    return c


def expected_files(config, inventory):
    files = [f['path'].removeprefix('service/') for f in inventory
             if f['path'].startswith('service/src/main/java/') and f['path'].endswith('.java')]
    def matches(name, rule):
        return name.startswith(rule) if rule.endswith('/') else name == rule
    for rule in config['include']+config['exclude']:
        if not any(matches(n, rule) for n in files):
            raise ValueError('Scope entry matches no committed production file: '+rule)
    selected = sorted(n for n in files if any(matches(n, r) for r in config['include'])
                      and not any(matches(n, r) for r in config['exclude']))
    if not selected:
        raise ValueError('Empty production scope')
    return selected


def xml(data, kind):
    if len(data) > 4*1024**2:
        raise ValueError('XML byte limit exceeded')
    text = data.decode('utf-8')
    if '\x00' in text or '<!ENTITY' in text.upper():
        raise ValueError('XML entities/unsupported encoding')
    declaration = re.search(r'<\?xml[^?]*encoding=[\"\']([^\"\']+)', text)
    if declaration and declaration[1].upper() != 'UTF-8':
        raise ValueError('XML requires UTF-8')
    if '<!DOCTYPE' in text.upper():
        if kind != 'report' or text.count(DOCTYPE) != 1:
            raise ValueError('Unsupported XML DOCTYPE')
        text = text.replace(DOCTYPE, '')  # Recognize the real JaCoCo header, never fetch report.dtd.
        if '<!DOCTYPE' in text.upper():
            raise ValueError('Unsupported XML DOCTYPE')
    root = ET.fromstring(text)
    if root.tag != kind:
        raise ValueError('Unexpected XML root: '+root.tag)
    return root


def derive_pom(original, run_id):
    if not re.fullmatch(r'[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}', run_id):
        raise ValueError('Invalid quality execution identity')
    if b'<!' in original:
        # The fixed starter has comments; declarations/entities are not allowed.
        if b'<!DOCTYPE' in original or b'<!ENTITY' in original:
            raise ValueError('Unsafe POM declaration')
    root = ET.fromstring(original)
    q = lambda n: '{'+POM_NS+'}'+n
    plugins = [p for p in root.findall('./'+q('build')+'/'+q('plugins')+'/'+q('plugin'))
               if p.findtext(q('artifactId')) == 'maven-surefire-plugin']
    if len(plugins) != 1:
        raise ValueError('Expected one fixed Surefire plugin')
    config = plugins[0].find(q('configuration'))
    if config is None or config.findtext(q('forkCount')) != '1' or config.findtext(q('argLine')) != '-Xmx128m -XX:ActiveProcessorCount=2':
        raise ValueError('Unsupported Surefire JVM configuration')
    if config.find(q('testFailureIgnore')) is not None:
        raise ValueError('Unexpected Surefire failure configuration')
    config.find(q('argLine')).text += (' -javaagent:/quality-tools/jacocoagent.jar='
        'destfile=/work/service/target/jacoco.exec,append=false,dumponexit=true,sessionid='+run_id)
    # Only assertion reports can yield FAIL. A nonzero Maven process always remains ERROR.
    ET.SubElement(config, q('testFailureIgnore')).text = 'true'
    ET.register_namespace('', POM_NS)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)+b'\n'


def number(value):
    if not isinstance(value, str) or not re.fullmatch(r'0|[1-9][0-9]{0,9}', value):
        raise ValueError('Invalid nonnegative report count')
    return int(value)


def surefire(reports):
    """Fresh safely collected bytes; the runner separately checks mtimes/process exit."""
    if not reports:
        raise ValueError('Missing Surefire reports')
    totals = dict(tests=0, failures=0, errors=0, skipped=0)
    classes = set()
    assertion_types = {'java.lang.AssertionError', 'org.opentest4j.AssertionFailedError',
                       'org.opentest4j.MultipleFailuresError'}
    for data in reports:
        suite = xml(data, 'testsuite')
        counts = {n: number(suite.get(n)) for n in totals}
        cases = suite.findall('testcase')
        observed = {k: sum(len(c.findall(tag)) for c in cases)
                    for k, tag in [('failures', 'failure'), ('errors', 'error'), ('skipped', 'skipped')]}
        if not counts['tests'] or len(cases) != counts['tests'] or any(counts[k] != observed[k] for k in observed):
            raise ValueError('Empty or inconsistent Surefire results')
        for case in cases:
            if not case.get('name') or not case.get('classname'):
                raise ValueError('Missing Surefire test identity')
            if sum(len(case.findall(t)) for t in ('failure', 'error', 'skipped')) > 1:
                raise ValueError('Ambiguous Surefire case')
            classes.add(case.get('classname').replace('.', '/'))
            for failure in case.findall('failure'):
                if failure.get('type') not in assertion_types:
                    raise ValueError('Unattributed test failure: '+str(failure.get('type')))
        for k in totals:
            totals[k] += counts[k]
    if totals['errors'] or totals['skipped']:
        raise ValueError('Errored or skipped Java tests do not establish a complete test run')
    return {**totals, 'passed':totals['tests']-totals['failures'], 'classes':sorted(classes)}


def class_info(text):
    classes = {}
    for line in text.splitlines():
        if not line.strip() or line.startswith('[INFO]') or 'INST   BRAN' in line:
            continue
        match = re.fullmatch(r'\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+class 0x([0-9a-f]{16}) ([A-Za-z0-9_$/]+)', line)
        if not match or match[7] in classes:
            raise ValueError('Malformed or duplicate JaCoCo classinfo')
        columns = ('INSTRUCTION', 'BRANCH', 'LINE', 'METHOD', 'COMPLEXITY')
        classes[match[7]] = {'id':match[6], **{k:int(match[i+1]) for i,k in enumerate(columns)}}
    if not classes:
        raise ValueError('No compiled classes')
    return classes


def execution_info(text, run_id, compiled, test_classes):
    entries, sessions = {}, []
    for line in text.splitlines():
        if not line.strip() or line.startswith('[INFO]') or line.startswith('CLASS ID'):
            continue
        session = re.fullmatch(r'Session "([a-f0-9-]+)": .+ - .+', line)
        if session:
            sessions.append(session[1]); continue
        match = re.fullmatch(r'([0-9a-f]{16})\s+(\d+) of\s+(\d+)\s+([A-Za-z0-9_$/]+)', line)
        if not match or match[4] in entries or int(match[2]) > int(match[3]):
            raise ValueError('Malformed or duplicate JaCoCo execution data')
        entries[match[4]] = {'id':match[1], 'hits':int(match[2]), 'probes':int(match[3])}
    if sessions != [run_id]:
        raise ValueError('JaCoCo session identity mismatch or absent instrumentation')
    for name, entry in entries.items():
        if name in compiled and compiled[name]['id'] != entry['id']:
            raise ValueError('Execution data belongs to different compiled classes: '+name)
    for name in test_classes:
        if name not in compiled or name not in entries or entries[name]['hits'] == 0:
            raise ValueError('Test class has no matching agent execution data: '+name)
    return entries


def counters(element):
    result = {k:(0,0) for k in COUNTERS}
    seen = set()
    for c in element.findall('counter'):
        k = c.get('type')
        if k not in result or k in seen:
            raise ValueError('Unknown or duplicate coverage counter')
        seen.add(k);result[k] = (number(c.get('missed')), number(c.get('covered')))
    return result


def sums(items, key):
    return tuple(sum(item[key][i] for item in items) for i in (0,1))


def same_aggregate(actual, children, types=COUNTERS):
    for k in types:
        if actual[k] != sums(children, k):
            raise ValueError('Inconsistent coverage aggregate: '+k)


def evaluate_report(data, expected, source_lines, thresholds, production, execution, run_id, started_ns, finished_ns):
    root = xml(data, 'report')
    if any(c.tag not in ('sessioninfo', 'package', 'counter') for c in root):
        raise ValueError('Unsupported coverage report element')
    sessions = root.findall('sessioninfo')
    if len(sessions) != 1 or sessions[0].get('id') != run_id:
        raise ValueError('Coverage session binding mismatch')
    # XML uses milliseconds; accept only this actual test-process interval.
    start, dump = (int(sessions[0].get(k, '-1')) for k in ('start', 'dump'))
    if not started_ns//1000000 <= start <= dump <= (finished_ns+999999)//1000000:
        raise ValueError('Stale or foreign JaCoCo session interval')
    all_classes, sources, packages = set(), {}, []
    for package in root.findall('package'):
        package_name = package.get('name', '')
        if package_name and not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*(?:/[A-Za-z_][A-Za-z0-9_]*)*', package_name):
            raise ValueError('Unsafe Java package identity')
        by_source = {}
        for cls in package.findall('class'):
            name, filename = cls.get('name'), cls.get('sourcefilename', '')
            if name not in production or name in all_classes or name.rpartition('/')[0] != package_name or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*\.java', filename):
                raise ValueError('Compiled class/report inventory mismatch')
            all_classes.add(name); c = counters(cls)
            methods = [counters(m) for m in cls.findall('method')]
            if any(sum(m['METHOD']) != 1 or not sum(m['INSTRUCTION']) for m in methods):
                raise ValueError('Invalid method coverage')
            same_aggregate(c, methods, ('INSTRUCTION','BRANCH','METHOD','COMPLEXITY'))
            if c['CLASS'] != ((0,1) if c['METHOD'][1] else (1,0)):
                raise ValueError('Inconsistent class coverage')
            for k in COUNTERS[:5]:
                if sum(c[k]) != production[name][k]:
                    raise ValueError('Report differs from compiled class counters: '+name+' '+k)
            if name not in execution and any(v[1] for v in c.values()):
                raise ValueError('Unexecuted class claims coverage')
            by_source.setdefault(filename, []).append(c)
        source_counters = []
        for source in package.findall('sourcefile'):
            name = source.get('name', '')
            file = 'src/main/java/'+(package_name+'/' if package_name else '')+name
            if file not in source_lines or file in sources or name not in by_source:
                raise ValueError('Source/report association mismatch: '+file)
            c = counters(source); same_aggregate(c, by_source.pop(name), ('INSTRUCTION','BRANCH','METHOD','COMPLEXITY','CLASS'))
            seen, line_counts, branches = set(), [0,0], [0,0]
            for line in source.findall('line'):
                nr, mi, ci, mb, cb = (number(line.get(k)) for k in ('nr','mi','ci','mb','cb'))
                if not 1 <= nr <= source_lines[file] or nr in seen or not mi+ci:
                    raise ValueError('Invalid or duplicate source line')
                seen.add(nr);line_counts[bool(ci)] += 1;branches[0] += mb;branches[1] += cb
            if c['LINE'] != tuple(line_counts) or c['BRANCH'] != tuple(branches):
                raise ValueError('Inconsistent source line/branch coverage')
            sources[file] = c; source_counters.append(c)
        if by_source:
            raise ValueError('Missing sourcefile coverage')
        c = counters(package);same_aggregate(c, source_counters);packages.append(c)
    if all_classes != set(production):
        raise ValueError('Report omits compiled production classes')
    same_aggregate(counters(root), packages)
    if any(n not in sources for n in expected):
        raise ValueError('Report omits expected production source')
    metrics, failures = {}, []
    for name, kind in METRICS.items():
        missed, covered = sums([sources[n] for n in expected], kind); total = missed+covered
        metrics[name] = {'missed':missed,'covered':covered,'total':total,'percent':covered/total*100 if total else None,
                         'threshold':thresholds[name],'status':'APPLICABLE' if total else 'NOT_APPLICABLE'}
        if not total:
            raise ValueError('Coverage '+name+' is NOT_APPLICABLE; configured threshold cannot be evaluated')
        if Decimal(covered)*100 < Decimal(str(thresholds[name]))*total:
            failures.append(name+' threshold unmet')
    return {'metrics':metrics,'failures':failures}

"""Campaign plan contracts only; no delivery, dispatch or inferred human approval."""
from datetime import datetime
import re

from paired_measurements import PROTOCOL, WORKFLOW, identity

SCHEMA = 'paired-rg-campaign-plan/v1'
ALGORITHM = 'sort balanced labelled slots by SHA256(seed:slot), ascending'


def digest(value, size=64):
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{'+str(size)+'}', value) is not None


def run_id(value):
    if not isinstance(value, str) or not re.fullmatch('[1-9][0-9]*', value):
        raise ValueError('A positive Actions run ID is required')
    return value


def draft(seed, count):
    import hashlib
    if not isinstance(seed, str) or not seed.strip():
        raise ValueError('A nonblank campaign seed is required')
    # Bound the size of the workflow input; this is not a sample-size recommendation.
    if type(count) is not int or not 2 <= count <= 1000 or count % 2:
        raise ValueError('Campaign pair count must be an explicit even integer from 2 to 1000')
    slots=['RG']*(count//2)+['GR']*(count//2)
    order=sorted(enumerate(slots),key=lambda x:hashlib.sha256(f'{seed}:{x[0]}'.encode()).hexdigest())
    return {'schema':SCHEMA,'protocol':PROTOCOL,'dataset':'campaign','state':'DRAFT',
            'seed':seed,'pairCount':count,'randomization':ALGORITHM,
            'pairs':[{'pair':i+1,'order':slot[1]} for i,slot in enumerate(order)]}


def validate_plan(plan, bound=True):
    try:
        expected=draft(plan['seed'],plan['pairCount'])
        if bound:expected.update(state='BOUND',binding=plan['binding'])
        if identity(plan) != identity(expected):
            raise ValueError('Campaign positions/order/schema differ from the reproducible plan')
        if not bound:return plan
        b=plan['binding'];config=b['configuration'];db=b['database'];checks=b['development']
        if set(b)!={'source','configuration','database','development'} or not digest(b['source'],40):
            raise ValueError('Invalid campaign source binding')
        if (set(config)!={'workflow','protocolSha256','implementationTree','toolsLockSha256','versionsSha256','warmupSource'}
                or config['workflow']!=WORKFLOW or not digest(config['implementationTree'],40)
                or not digest(config['warmupSource'],40)
                or any(not digest(config[k]) for k in ('protocolSha256','toolsLockSha256','versionsSha256'))):
            raise ValueError('Incomplete campaign configuration identity')
        if set(db)!={'trivy.db','metadata.json'} or not all(digest(h) for h in db.values()):
            raise ValueError('Incomplete campaign database identity')
        if len(checks)!=2 or [c['order'] for c in checks]!=['RG','GR']:
            raise ValueError('Fresh development RG and GR receipts are required')
        if len({run_id(c['runId']) for c in checks})!=2:
            raise ValueError('Development receipts must identify different runs')
        for c in checks:
            if set(c)!={'runId','order','pairSha256','manifestSha256'} or not all(digest(c[k]) for k in ('pairSha256','manifestSha256')):
                raise ValueError('Invalid development evidence receipt')
    except (KeyError,TypeError,AttributeError) as error:
        raise ValueError('Incomplete campaign plan') from error
    return plan


def bind(plan, source, configuration, database, development):
    validate_plan(plan,bound=False)
    value={**plan,'state':'BOUND','binding':{'source':source,'configuration':configuration,
           'database':database,'development':development}}
    return validate_plan(value)


def freeze(plan, reviewer, rationale, authorized_at):
    """Called only with a person's explicit CLI declarations (or labelled tests)."""
    validate_plan(plan)
    value={'schema':'paired-rg-campaign-control/v1','plan':plan,
           'authorization':{'schema':'paired-rg-campaign-authorization/v1',
             'planIdentity':identity(plan),'decision':'authorize-campaign',
             'reviewer':reviewer,'rationale':rationale,'authorizedAt':authorized_at,
             'declaration':'Human-supplied identity and authorization; not independently authenticated'}}
    validate_frozen(value)
    return value


def validate_frozen(value, expected_identity=None):
    import json
    try:
        if set(value)!={'schema','plan','authorization'} or value['schema']!='paired-rg-campaign-control/v1':
            raise ValueError('Frozen campaign control required')
        validate_plan(value['plan'])
        auth=value['authorization']
        if (set(auth)!={'schema','planIdentity','decision','reviewer','rationale','authorizedAt','declaration'}
                or auth['schema']!='paired-rg-campaign-authorization/v1'
                or auth['planIdentity']!=identity(value['plan']) or auth['decision']!='authorize-campaign'
                or any(not isinstance(auth[k],str) or not auth[k].strip() for k in ('reviewer','rationale','declaration'))):
            raise ValueError('Explicit human campaign authorization is missing or mismatched')
        time=datetime.fromisoformat(auth['authorizedAt'])
        if time.utcoffset() is None or time.utcoffset().total_seconds()!=0:
            raise ValueError('Authorization requires an automatic UTC timestamp')
        if expected_identity is not None and (not digest(expected_identity) or identity(value)!=expected_identity):
            raise ValueError('Frozen campaign identity mismatch')
        if len(json.dumps(value,indent=2).encode())>60000:
            raise ValueError('Frozen campaign exceeds the bounded workflow input payload')
    except (KeyError,TypeError,AttributeError) as error:
        raise ValueError('Missing or invalid campaign authorization') from error
    return value


def validate_execution(value, source, configuration, position, order):
    validate_frozen(value)
    plan=value['plan'];binding=plan['binding']
    if source!=binding['source'] or configuration!=binding['configuration']:
        raise ValueError('Campaign source/protocol/configuration changed; prepare a new plan')
    if type(position) is not int or not 1<=position<=plan['pairCount']:
        raise ValueError('Campaign pair number is outside the frozen plan')
    if plan['pairs'][position-1]['order']!=order:
        raise ValueError('Order differs from frozen campaign plan')


def validate_observation(pair, control):
    validate_frozen(control)
    plan=control['plan'];binding=plan['binding']
    if pair.get('schema')!='paired-rg-pair/v1' or type(pair.get('attempt')) is not int or pair['attempt'] not in (1,2):
        raise ValueError('Invalid campaign observation schema or attempt')
    if (pair.get('dataset')!='campaign' or pair.get('protocol')!=PROTOCOL or pair.get('workflow')!=WORKFLOW
            or pair.get('planIdentity')!=identity(plan) or pair.get('campaignPlan')!=control
            or pair.get('source')!=binding['source'] or pair.get('frozenDatabase')!=binding['database']):
        raise ValueError('Do not pool campaign datasets, plans, sources, authorizations or databases')
    if pair.get('warmupSource')!=binding['configuration']['warmupSource']:
        raise ValueError('Campaign cache warmup source changed')
    validate_execution(control,pair['source'],binding['configuration'],pair.get('pair'),pair.get('order'))
    run_id(pair.get('runId'))
    for arm in pair.get('arms',{}).values():
        if (arm.get('database',{}).get('sha256')!=binding['database']
                or arm.get('toolsLockSha256')!=binding['configuration']['toolsLockSha256']):
            raise ValueError('Campaign arm database or tool configuration differs from frozen plan')

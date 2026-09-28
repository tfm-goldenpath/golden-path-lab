// Synthetic observations exercise the real completion function, not live admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
const source = resolve(import.meta.dirname, '../..');
const image = `registry.invalid/quotes@sha256:${'a'.repeat(64)}`;
for (const fault of ['', 'restoration', 'primary', 'pending', 'image', 'pod', 'unready']) {
  test(`F07 completion validates recovery and the original running digest: ${fault || 'success'}`, t => {
    const root = mkdtempSync(join(tmpdir(), 'gp-f07-completion-'));
    t.after(() => rmSync(root, {recursive:true, force:true}));
    mkdirSync(join(root, 'F07'));
    const save = (name, value) => writeFileSync(join(root, name), JSON.stringify(value));
    save('state.json', {imageRepository:image.split('@')[0], digest:image.split('@')[1]});
    save('F07/result.json', {scenario:'F07', image:fault === 'image' ? image.replaceAll('a', 'b') : image,
      status:'DIRECTED_REJECTION_AND_RESTORATION', sameDigestL01:fault === 'pending' ? 'accepted' : 'pending'});
    save('F07/recovery.json', {originalStatus:fault === 'primary' ? 37 : 0,
      restorationStatus:fault === 'restoration' ? 43 : 0, restorationAttempted:true});
    save('deployment.json', {metadata:{name:'quotes-node', namespace:'tfm-golden', generation:1},
      spec:{replicas:1, template:{spec:{containers:[{name:'quotes-node',image}]}}},
      status:{observedGeneration:1,replicas:1,updatedReplicas:1,readyReplicas:1,availableReplicas:1}});
    save('pods.json', {items:[{metadata:{name:'quotes',namespace:'tfm-golden',labels:{app:'quotes-node'}},
      spec:{containers:[{name:'quotes-node',image}]},status:{phase:'Running',conditions:[{type:'Ready',status:'True'}],
        containerStatuses:[{name:'quotes-node',ready:fault !== 'unready',state:{running:{}},
          imageID:fault === 'pod' ? image.replaceAll('a', 'b') : image}]}}]});
    const env = {...process.env, GP_STATE:root, GP_IMAGE:image};
    delete env.BASH_ENV; delete env.ENV;
    const result = spawnSync('bash', ['-c', `
set -Eeuo pipefail
source scripts/lib/context.sh
source tests/scenarios/f07.sh
state_dir="$GP_STATE"; image="$GP_IMAGE"; mode=local
k() { cat "$state_dir/$4.json"; }
scenario_f07_complete
`], {cwd:source,env,encoding:'utf8'});
    assert.ifError(result.error);
    assert.equal(result.status === 0, !fault, result.stderr);
    assert.equal(existsSync(join(root, 'F07-completed.json')), !fault);
    assert.equal(JSON.parse(readFileSync(join(root, 'F07/result.json'))).status, 'DIRECTED_REJECTION_AND_RESTORATION');
    if (!fault) assert.equal(JSON.parse(readFileSync(join(root, 'F07-completed.json'))).sameDigestL01, 'accepted-and-healthy');
  });
}

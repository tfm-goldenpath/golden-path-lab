import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyImageRollout } from '../../scripts/check-image-rollout.mjs';

const before = `registry.invalid/quotes@sha256:${'a'.repeat(64)}`;
const after = `registry.invalid/quotes@sha256:${'b'.repeat(64)}`;
function fixture() {
  const deployment = {
    metadata: { name: 'quotes-node', namespace: 'tfm-golden', generation: 2 },
    spec: { replicas: 1, template: { spec: { containers: [{ name: 'quotes-node', image: after }] } } },
    status: { observedGeneration: 2, replicas: 1, updatedReplicas: 1, readyReplicas: 1, availableReplicas: 1 },
  };
  const pods = { items: [{
    metadata: { name: 'quotes-new', uid: 'replacement-pod', namespace: 'tfm-golden', labels: { app: 'quotes-node' } },
    spec: { containers: [{ name: 'quotes-node', image: after }] },
    status: { phase: 'Running', conditions: [{ type: 'Ready', status: 'True' }], containerStatuses: [{
      name: 'quotes-node', ready: true, state: { running: {} }, imageID: `docker-pullable://${after}`,
    }] },
  }] };
  return { deployment, pods };
}

test('L01 proves a distinct image is running in ready replacement Pods', () => {
  const { deployment, pods } = fixture();
  const result = verifyImageRollout(before, after, deployment, pods);
  assert.equal(result.status, 'PASS');
  assert.equal(result.toImage, after);
  assert.equal(result.pods[0].uid, 'replacement-pod');
});

test('an annotation-only update with the same digest is insufficient', () => {
  const { deployment, pods } = fixture();
  assert.throws(() => verifyImageRollout(after, after, deployment, pods), /digest must differ/);
});

for (const [name, mutate] of [
  ['old running digest despite a new desired image', f => { f.pods.items[0].status.containerStatuses[0].imageID = before; }],
  ['missing runtime image ID', f => { delete f.pods.items[0].status.containerStatuses[0].imageID; }],
  ['unready replacement', f => { f.pods.items[0].status.containerStatuses[0].ready = false; }],
  ['no running container', f => { f.pods.items[0].status.containerStatuses[0].state = { waiting: {} }; }],
  ['old desired image', f => { f.deployment.spec.template.spec.containers[0].image = before; }],
  ['unobserved generation', f => { f.deployment.status.observedGeneration = 1; }],
  ['old replicas remain active', f => { f.deployment.status.replicas = 2; }],
  ['no Pods', f => { f.pods.items = []; }],
  ['Pod in a different namespace', f => { f.pods.items[0].metadata.namespace = 'tfm-reference'; }],
]) {
  test(`L01 rejects ${name}`, () => {
    const f = fixture(); mutate(f);
    assert.throws(() => verifyImageRollout(before, after, f.deployment, f.pods));
  });
}

test('terminating previous Pods do not count as active replacement replicas', () => {
  const { deployment, pods } = fixture();
  pods.items.push({ metadata: { deletionTimestamp: '2026-09-27T12:00:00Z' }, spec: { containers: [{ image: before }] } });
  assert.equal(verifyImageRollout(before, after, deployment, pods).status, 'PASS');
});

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { assertDigest } from './lab-contracts.mjs';

// Admission success alone does not establish that the replacement is running.
// Check the observed Deployment generation and the ready Pods' runtime image IDs.
export function verifyImageRollout(previousImage, image, deployment, pods) {
  assertDigest(previousImage);
  assertDigest(image);
  if (previousImage.split('@')[1] === image.split('@')[1]) throw new Error('Replacement digest must differ');
  return { ...verifyDeployedImage(image, deployment, pods), fromImage: previousImage };
}

export function verifyDeployedImage(image, deployment, pods) {
  assertDigest(image);
  const desired = deployment?.spec?.replicas;
  const generation = deployment?.metadata?.generation;
  const status = deployment?.status;
  const container = deployment?.spec?.template?.spec?.containers?.find(c => c.name === 'quotes-node');
  if (deployment?.metadata?.name !== 'quotes-node' || deployment.metadata.namespace !== 'tfm-golden'
    || container?.image !== image || !Number.isInteger(desired) || desired < 1
    || !Number.isInteger(generation) || generation < 1 || !(status?.observedGeneration >= generation)
    || ['replicas', 'updatedReplicas', 'readyReplicas', 'availableReplicas'].some(key => status[key] !== desired)) {
    throw new Error('Deployment has not completed the replacement rollout');
  }
  const active = pods?.items?.filter(p => !p.metadata?.deletionTimestamp);
  if (!Array.isArray(active) || active.length !== desired) throw new Error('Unexpected active Pod count');
  const digest = image.split('@')[1];
  const observed = active.map(pod => {
    const spec = pod.spec?.containers?.find(c => c.name === 'quotes-node');
    const runtime = pod.status?.containerStatuses?.find(c => c.name === 'quotes-node');
    if (pod.metadata?.namespace !== 'tfm-golden' || pod.metadata.labels?.app !== 'quotes-node'
      || spec?.image !== image || pod.status?.phase !== 'Running'
      || !pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
      || runtime?.ready !== true || !runtime.state?.running
      || !(runtime.imageID === digest || runtime.imageID?.endsWith(`@${digest}`))) {
      throw new Error('Pod is not ready on the replacement image digest');
    }
    return { name: pod.metadata.name, uid: pod.metadata.uid, imageID: runtime.imageID };
  });
  return { status: 'PASS', toImage: image, observedGeneration: status.observedGeneration, pods: observed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [previousImage, image, deploymentFile, podsFile] = process.argv.slice(2);
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  const pods = JSON.parse(fs.readFileSync(podsFile, 'utf8'));
  const result = previousImage === '--same-image'
    ? verifyDeployedImage(image, deployment, pods)
    : verifyImageRollout(previousImage, image, deployment, pods);
  console.log(JSON.stringify(result, null, 2));
}

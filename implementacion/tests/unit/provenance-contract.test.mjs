// Synthetic content fixtures; successful field checks are not authentication.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStatementPredicate} from '../../scripts/lab-contracts.mjs';
const type='https://slsa.dev/provenance/v1';
const repository='https://github.com/example/lab', commit='b'.repeat(40);
export function predicate(mode='local') {
  return {buildDefinition:{buildType:mode==='local'?'https://tfm-goldenpath.dev/buildtypes/local/v1':'https://actions.github.io/buildtypes/workflow/v1',
    externalParameters:{workflow:{repository}},resolvedDependencies:[{uri:repository,digest:{gitCommit:commit}}]},
    runDetails:{builder:{id:mode==='local'?'https://tfm-goldenpath.dev/builders/local-development':'https://github.com/actions/runner/github-hosted'}}};
}
test('valid local provenance passes the explicit origin contract',()=>validateStatementPredicate(predicate(),type,repository,commit));
for (const [field,mutate,code] of [
  ['repository',p=>p.buildDefinition.externalParameters.workflow.repository='https://example.invalid/unauthorized','PROVENANCE_REPOSITORY'],
  ['revision',p=>p.buildDefinition.resolvedDependencies[0].digest.gitCommit='c'.repeat(40),'PROVENANCE_REVISION'],
  ['build type',p=>p.buildDefinition.buildType='https://example.invalid/build','PROVENANCE_BUILD_TYPE'],
  ['builder',p=>p.runDetails.builder.id='https://example.invalid/builder','PROVENANCE_BUILDER'],
]) test(`rejects incorrect ${field} with a precise diagnostic`,()=>{
  const p=predicate();mutate(p);
  assert.throws(()=>validateStatementPredicate(p,type,repository,commit),new RegExp(code));
});
test('unknown predicate cannot silently use the provenance branch',()=>assert.throws(()=>validateStatementPredicate(predicate(),'https://example.invalid/type',repository,commit),/Unsupported/));

// Two deliberately fixed adapters, not executable user configuration.
export const JAVA_PROFILE='java-http-consumer/v1';
export const profiles=Object.freeze({
  'node-http-consumer/v1':Object.freeze({template:'node-http',producer:'bin/deliver:node-http-consumer/v1',
    name:'independent-node',message:'Hello from the independent consumer'}),
  [JAVA_PROFILE]:Object.freeze({template:'java-http',producer:'bin/deliver:java-http-consumer/v1',
    name:'independent-java',message:'Hello from the independent Java consumer'}),
});
export function consumerProfile(name) {
  if(!Object.hasOwn(profiles,name)) throw new Error('Unsupported consumer profile');
  return profiles[name];
}

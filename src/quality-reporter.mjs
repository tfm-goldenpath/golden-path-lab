// Consume runner events, never interpret test stdout as control data.
export default async function* report(events) {
 yield JSON.stringify({type:'quality:start',schema:'node-quality-report/v1',binding:JSON.parse(process.env.GP_QUALITY_BINDING)})+'\n';
 for await(const event of events) {
  if(['test:coverage','test:summary','test:pass','test:fail'].includes(event.type)) {
   yield JSON.stringify(event,(_key,value)=>value instanceof Error?{message:value.message,code:value.code,failureType:value.failureType,cause:value.cause,signal:value.signal}:value)+'\n';
  }
 }
 yield '{"type":"quality:end"}\n';
}

// Real, sequential Java quality evaluations in an independent committed repository.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {initialize} from '../../../src/consumer.mjs';
import {verifyQuality} from '../../../src/quality-gate.mjs';
const engine=path.resolve(import.meta.dirname,'../../..'),parent=path.resolve(process.argv[2]);
fs.mkdirSync(parent,{mode:0o700});
const consumer=path.join(parent,'independent Java consumer');
const git=(...args)=>execFileSync('git',['-C',consumer,...args],{encoding:'utf8'}).trim();
const engineCommit=execFileSync('git',['-C',engine,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
initialize(engine,consumer,'https://example.invalid/local-java-quality-validation',engineCommit,'java-http-consumer/v1');
git('init','-q');
const write=(name,value)=>fs.writeFileSync(path.join(consumer,'service',name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
// Fixture thresholds chosen before execution. The starter does not exercise main,
// the private constructor or the shutdown hook; this is not a recommended standard.
const config={schema:'java-quality-gate/v1',include:['src/main/java/'],exclude:[],thresholds:{lines:80,methods:40,branches:70},limits:{timeoutSeconds:300,maxOutputBytes:16777216}};
write('src/test/java/trial/AgentTest.java',`package trial;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class AgentTest { @Test void actualAgentAndLimits() {
 var args=java.lang.management.ManagementFactory.getRuntimeMXBean().getInputArguments();
 assertTrue(args.stream().anyMatch(a->a.startsWith("-javaagent:/quality-tools/jacocoagent.jar=")));
 assertTrue(args.contains("-Xmx128m"));assertTrue(args.contains("-XX:ActiveProcessorCount=2"));
} }
`);
const cases=[];
for(const [name,expected] of [['pass','PASS'],['threshold','FAIL'],['assertion','FAIL'],['evidence-error','ERROR'],['unexercised','FAIL'],['unsafe-output','ERROR']]) {
 write('quality-gate.json',name==='threshold'?{...config,thresholds:{lines:100,methods:100,branches:100}}:config);
 for(const file of ['src/test/java/trial/NegativeTest.java','src/main/java/trial/Never.java']) fs.rmSync(path.join(consumer,'service',file),{force:true});
 let body;
 if(name==='assertion') body='org.junit.jupiter.api.Assertions.assertEquals(1,2);';
 if(name==='evidence-error') body='java.nio.file.Files.deleteIfExists(java.nio.file.Path.of("target/jacoco.exec"));java.nio.file.Files.createDirectory(java.nio.file.Path.of("target/jacoco.exec"));';
 if(name==='unsafe-output') {
  const sentinel=path.join(parent,'harmless-sentinel.txt');fs.writeFileSync(sentinel,'HARMLESS_EXTERNAL_JAVA_QUALITY_SENTINEL');
  body=`java.nio.file.Files.createSymbolicLink(java.nio.file.Path.of("target/surefire-reports/external-link"),java.nio.file.Path.of(${JSON.stringify(sentinel)}));`;
 }
 if(body) write('src/test/java/trial/NegativeTest.java',`package trial; class NegativeTest { @org.junit.jupiter.api.Test void controlled() throws Exception { ${body} } }\n`);
 if(name==='unexercised') write('src/main/java/trial/Never.java','package trial; public class Never { public int unused(int n) { if(n>0) return 1; return 0; } }\n');
 git('add','.');git('-c','user.name=Local validation','-c','user.email=local@example.invalid','commit','-qm','Committed Java quality case: '+name);
 const consumerCommit=git('rev-parse','HEAD'),output=path.join(parent,name),started=Date.now();
 const run=spawnSync('bash',[path.join(engine,'bin/deliver'),'quality','--consumer',consumer,'--output',output],{cwd:name==='pass'?consumer:'/tmp',encoding:'utf8',timeout:1100000});
 fs.writeFileSync(path.join(parent,name+'.log'),(run.stdout||'')+(run.stderr||''),{flag:'wx'});
 const result=JSON.parse(fs.readFileSync(path.join(output,'result.json'))),verification=verifyQuality(output);
 const record={name,expected,observed:result.status,exitCode:run.status,consumerCommit,engineCommit,output,elapsedMs:Date.now()-started,verification,checksumsSha256:createHash('sha256').update(fs.readFileSync(path.join(output,'checksums.json'))).digest('hex')};
 cases.push(record);fs.writeFileSync(path.join(parent,'validation.json'),JSON.stringify({schema:'java-quality-validation/v1',engineCommit,remoteConsumer:false,cases},null,2)+'\n');
 git('bundle','create',path.join(parent,'consumer.bundle'),'--all');
 if(name==='unsafe-output') {
  function inspect(dir) {for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,entry.name);if(entry.isDirectory()) inspect(p);else if(fs.readFileSync(p).includes('HARMLESS_EXTERNAL_JAVA_QUALITY_SENTINEL')) throw new Error('External sentinel was retained');}}
  inspect(output);
 }
 if(result.status!==expected||run.status!=={PASS:0,FAIL:1,ERROR:2}[expected]) throw new Error(name+': '+JSON.stringify(result));
 if(name==='unexercised'&&!fs.readFileSync(path.join(output,'report/java-quality-files/report/jacoco.xml'),'utf8').includes('trial/Never')) throw new Error('Unexercised class omitted');
 console.log(JSON.stringify(record));
}
git('bundle','verify',path.join(parent,'consumer.bundle'));

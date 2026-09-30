// Harmless compatibility check; no exploit inputs.
const assert=require('node:assert/strict');
const ip=require('ip'); const result=ip.toString(ip.toBuffer('192.0.2.1')); assert.equal(result,'192.0.2.1');
console.log(JSON.stringify({status:'PASS',result}));

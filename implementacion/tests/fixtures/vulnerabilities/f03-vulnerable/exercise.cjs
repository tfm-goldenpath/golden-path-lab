// Harmless compatibility check; no exploit inputs.
const assert=require('node:assert/strict');
const parse=require('minimist'); const result=parse(['--coverage','basic','--amount','100000']); assert.deepEqual(result,{_:[],coverage:'basic',amount:100000});
console.log(JSON.stringify({status:'PASS',result}));

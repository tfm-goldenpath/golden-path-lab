// Harmless compatibility check; no exploit inputs.
const assert=require('node:assert/strict');
const unset=require('lodash.unset'); const result={temporary:true,retained:1}; assert.equal(unset(result,'temporary'),true); assert.deepEqual(result,{retained:1});
console.log(JSON.stringify({status:'PASS',result}));

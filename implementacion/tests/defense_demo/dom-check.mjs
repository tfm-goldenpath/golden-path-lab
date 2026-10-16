// Minimal synthetic DOM harness. With a URL, render that real read-only session.
// This verifies text/data mapping and offline behavior, not browser layout.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const data=process.argv[2]?await (await fetch(process.argv[2]+'/api/session')).json():null;
if(!data)throw Error('Usage: node tests/defense_demo/dom-check.mjs http://127.0.0.1:PORT');
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.classList={toggle(){}};this.hidden=false;this._text='';}
  set textContent(x){this._text=String(x);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  showModal(){this.open=true;}close(){this.open=false;}
}
const elements=new Map();
const document={readyState:'complete',createElement:tag=>new Element(tag),
 getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},querySelectorAll:()=>[]};
const context={document,window:{SAVED_SESSION:{...data,recorded:true,savedUTC:'synthetic DOM harness over real session'}},
 fetch(){throw Error('Offline renderer attempted network');},setInterval(){throw Error('Offline renderer started polling');}};
vm.runInNewContext(readFileSync(root+'demo/app.js','utf8'),context);
assert.equal(elements.get('pipeline').children.length,15);
assert.equal(elements.get('cases').children.length,20);
assert.equal(elements.get('attempts').children.length,4);
assert.equal(elements.get('receipts').children.length,data.events.length);
assert.equal(elements.get('source').textContent.includes(data.session.source.contentHash),true);
assert.equal(elements.get('connection').textContent,'Ejecución guardada; no en directo');
assert.equal(elements.get('overall').textContent.length>0,true);
console.log(JSON.stringify({status:'CONFIRMED',boundary:'DOM/data mapping; layout not reviewed',session:data.session.session,events:data.events.length,stages:15,cases:20,attempts:4,offlineNetworkCalls:0}));

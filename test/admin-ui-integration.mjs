// DOM + local workerd integration: no browser session, production keys or cloud writes.
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM} from 'jsdom';
import {html,js} from '../src/pages/admin-ui.mjs';

async function until(predicate,label){for(let i=0;i<500;i++){if(await predicate())return;await delay(10);}throw Error('Timed out: '+label);}

export async function adminUIIntegration({dispatch,token,setFault,cloudCreates}) {
  const dom=new JSDOM(html,{url:'https://admin.openplayx.com/adminzzz/relay',runScripts:'outside-only'});
  const w=dom.window;const $=id=>w.document.getElementById(id);const requests=[];
  let loseResponse=true;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  Object.defineProperty(w.crypto,'randomUUID',{value:()=>crypto.randomUUID()});
  w.setInterval=()=>0;
  w.fetch=async(path,init={})=>{
    const headers=new Headers(init.headers);headers.set('Cf-Access-Jwt-Assertion',token);
    if(init.method!=='GET')headers.set('Origin','https://admin.openplayx.com');
    requests.push({path,method:init.method,key:headers.get('Idempotency-Key'),body:init.body});
    const response=await dispatch(new URL(path,'https://admin.openplayx.com'),{...init,headers});
    if(path==='/v1/adminzzz/relay/nodes'&&init.method==='POST'&&loseResponse&&response.ok){loseResponse=false;await response.arrayBuffer();throw Error('fixture lost response after acceptance');}
    return response;
  };
  const change=element=>element.dispatchEvent(new w.Event('change',{bubbles:true}));
  const input=element=>element.dispatchEvent(new w.Event('input',{bubbles:true}));
  const baseline=cloudCreates();
  try {
    w.eval(js);
    await until(()=>!$('create').disabled,'admin session loads');
    setFault('network');$('create').click();
    await until(()=>!$('catalog-retry').hidden,'catalog network failure shown');
    const form=$('create-form');
    assert.match($('create-error').textContent,/云平台/);
    assert.match(form.elements.region.textContent,/加载失败/);
    assert.equal(form.elements.region.disabled,true);assert.equal(form.elements.plan.disabled,true);
    assert.equal($('create-submit').disabled,true);assert.equal($('new-price').textContent,'—');
    assert.equal(cloudCreates(),baseline);
    setFault('empty');$('catalog-retry').click();
    await until(()=>!$('catalog-retry').hidden&&$('create-error').textContent.includes('没有符合'),'empty catalog is actionable');
    assert.equal($('create-submit').disabled,true);assert.equal(cloudCreates(),baseline);
    setFault(null);$('catalog-retry').click();
    await until(()=>!form.elements.region.disabled,'retry recovers catalog');
    assert.equal($('create-error').textContent,'');assert.equal($('catalog-retry').hidden,true);
    assert.deepEqual(Array.from(form.elements.region.options,o=>o.value),['','ewr']);
    form.elements.name.value='New Jersey UI fixture';input(form.elements.name);
    form.elements.region.value='ewr';change(form.elements.region);
    assert.deepEqual(Array.from(form.elements.plan.options,o=>o.value),['','vc2-1c-0.5gb']);
    form.elements.plan.value='vc2-1c-0.5gb';change(form.elements.plan);
    assert.equal($('new-price').textContent,'$3.50/月');assert.equal($('create-submit').disabled,true);
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(requests.filter(r=>r.path==='/v1/adminzzz/relay/nodes'&&r.method==='POST').length,0,'no purchase before explicit checkbox confirmation');
    form.elements.confirmed.checked=true;change(form.elements.confirmed);
    assert.equal($('create-submit').disabled,false);
    $('create-submit').click();
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await until(()=>!$('create-submit').disabled&&$('create-error').textContent.includes('连接失败'),'lost response permits explicit retry');
    assert.equal(requests.filter(r=>r.path==='/v1/adminzzz/relay/nodes'&&r.method==='POST').length,1,'double submission while pending is blocked');
    $('create-submit').click();
    await until(()=>!$('create-dialog').open,'idempotent retry accepted');
    const creates=requests.filter(r=>r.path==='/v1/adminzzz/relay/nodes'&&r.method==='POST');
    assert.equal(creates.length,2);assert.equal(creates[0].key,creates[1].key);assert.equal(creates[0].body,creates[1].body);
    const response=await w.fetch('/v1/adminzzz/relay/nodes',{method:'GET'});const data=await response.json();
    assert.equal(data.summary.total,1);assert.equal(data.operations.length,1);
    await until(()=>cloudCreates()===baseline+1,'only one simulated cloud instance created');
    assert.match($('budget-note').textContent,/3\.50/);
  } finally {setFault(null);w.close();}
}

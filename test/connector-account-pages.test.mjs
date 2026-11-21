import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {connectorAccountHTML,connectorAccountJS} from '../src/pages/connector-account-ui.mjs';
import {pageResponse as accountPages} from '../src/pages/index.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function page(path,handler){const dom=new JSDOM(connectorAccountHTML,{url:'https://api.test/account/'+path,runScripts:'outside-only'}),calls=[];dom.window.fetch=async(url,init)=>{const call={url,...init,body:init.body&&JSON.parse(init.body)};calls.push(call);const value=await handler(call);return {ok:true,json:async()=>value};};dom.window.eval(connectorAccountJS);return {dom,calls,w:dom.window,field:id=>dom.window.document.getElementById(id)}}
async function login(p){p.field('email').value='owner@example.com';p.field('password').value='owner-password-123';p.field('login-form').dispatchEvent(new p.w.Event('submit',{cancelable:true}));await tick()}
test('Connector approval sends only the displayed code, logs out and never persists platform credentials',async()=>{
 const p=page('connector#code=ABCDEFGHJK',call=>call.url.endsWith('/login')?{accessToken:'private-access'}:{});
 assert.equal(p.w.location.hash,'');assert.equal(p.calls.length,0);await login(p);
 assert.deepEqual(p.calls.map(c=>c.url),['/v1/auth/login','/v1/relay/me/connector-bindings/approve','/v1/auth/logout']);
 assert.deepEqual(p.calls[1].body,{userCode:'ABCDEFGHJK'});assert.equal(p.calls[1].headers.Authorization,'Bearer private-access');assert.equal(p.field('password').value,'');assert.equal(p.w.localStorage.length,0);assert.match(p.field('status').textContent,/已确认/);p.dom.window.close();
});
test('device grant page preserves existing selection and sends only explicit checked service IDs with revision',async()=>{
 const p=page('permissions',call=>{
  if(call.url.endsWith('/login'))return {accessToken:'access'};
  if(call.url.endsWith('/devices'))return {items:[{deviceId:'phone_a',name:'My phone',platform:'ios',status:'enabled'}]};
  if(call.url.endsWith('/services'))return {items:[{serviceId:'service_a',name:'SMB',type:'smb',status:'enabled'},{serviceId:'service_b',name:'Jellyfin',type:'jellyfin',status:'enabled'}]};
  if(call.url.endsWith('/grants')&&call.method==='GET')return {items:[{serviceId:'service_a'}],revision:'42'};
  return {};
 });await login(p);await tick();const inputs=p.field('services').querySelectorAll('input');assert.equal(inputs.length,2);assert.equal(inputs[0].checked,true);assert.equal(inputs[1].checked,false);
 inputs[0].checked=false;inputs[1].checked=true;p.field('grant-form').dispatchEvent(new p.w.Event('submit',{cancelable:true}));await tick();
 const put=p.calls.find(c=>c.method==='PUT');assert.equal(put.url,'/v1/relay/me/devices/phone_a/grants');assert.equal(put.headers['If-Match'],'"42"');assert.deepEqual(put.body,{serviceIds:['service_b']});p.dom.window.close();
});
test('Connector account pages reuse strict CSP and are read-only until explicit user submission',()=>{
 for(const path of ['connector','permissions','assets/connector.js']){const response=accountPages(new Request('https://api.test/account/'+path));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/)}
});

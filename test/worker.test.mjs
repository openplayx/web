import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {proxyAPI} from '../src/api-proxy.mjs';
const req=(path,init={})=>new Request('https://openplayx.com'+path,init);
const fixture=()=>{const calls=[];return {calls,env:{API:{async fetch(request){calls.push(request);return Response.json({ok:true},{headers:{ETag:'"42"','Set-Cookie':'private=must-not-return'}})}},ASSETS:{fetch:async()=>new Response('marketing asset')}}}};
test('marketing assets remain separate; account pages have no analytics and strict security headers',async()=>{
 const {env,calls}=fixture();assert.equal(await (await worker.fetch(req('/'),env)).text(),'marketing asset');
 for(const path of ['/account/','/account/register','/account/setup','/account/connector','/account/permissions']){const response=await worker.fetch(req(path),env);assert.equal(response.status,200);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');const html=await response.text();assert.ok(!html.includes('analytics.js'));assert.ok(!html.includes('posthog'))}
 assert.equal(calls.length,0);
});
test('account proxy isolates cookies and enforces same-origin writes',async()=>{
 const {env,calls}=fixture();const headers={Origin:'https://openplayx.com',Cookie:'marketing=private',Authorization:'Bearer account','If-Match':'"42"','Content-Type':'application/json'};
 const response=await worker.fetch(req('/v1/relay/me/devices/phone_a/grants',{method:'PUT',headers,body:'{"serviceIds":[]}'}),env);
 assert.equal(response.status,200);assert.equal(calls[0].url,'https://api.openplayx.com/v1/relay/me/devices/phone_a/grants');assert.equal(calls[0].headers.get('Origin'),'https://api.openplayx.com');assert.equal(calls[0].headers.get('Cookie'),null);assert.equal(calls[0].headers.get('Authorization'),'Bearer account');assert.equal(calls[0].headers.get('If-Match'),'"42"');assert.equal(await calls[0].text(),'{"serviceIds":[]}');assert.equal(response.headers.get('Set-Cookie'),null);
 for(const Origin of ['https://evil.test',null]){const h={...headers};if(Origin)h.Origin=Origin;else delete h.Origin;assert.equal((await worker.fetch(req('/v1/auth/login',{method:'POST',headers:h,body:'{}'}),env)).status,403)}
 assert.equal(calls.length,1);
});
test('public Web never serves admin or forwards admin, bootstrap, operator and LLM requests',async()=>{
 const {env,calls}=fixture();for(const path of ['/adminzzz','/adminzzz/relay','/adminzzz/assets/app.js','/v1/adminzzz/session','/v1/adminzzz/relay/nodes','/v1/adminzzz/bootstrap/node_123','/v1/llm/chat/completions','/v1/relay/connector/config','/v1/auth/operator/users'])assert.equal((await worker.fetch(req(path,{headers:{'Cf-Access-Jwt-Assertion':'edge-jwt'}}),env)).status,404);assert.equal(calls.length,0);
});
test('upstream redirects and non-JSON responses never become public HTML',async()=>{
 for(const upstream of [new Response('private HTML',{status:302,headers:{Location:'https://evil.test'}}),new Response('private HTML',{status:200})]){const response=await proxyAPI(req('/v1/relay/me/services'),{API:{fetch:async()=>upstream}});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private HTML'))}
 assert.equal((await proxyAPI(req('/v1/relay/me/services'),{})).status,503);
});

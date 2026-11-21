import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import adminWorker from '../src/admin-worker.mjs';
import {proxyAPI} from '../src/api-proxy.mjs';
const req=(path,init={})=>new Request('https://admin.openplayx.com'+path,init);
const fixture=()=>{const calls=[];return {calls,env:{API:{async fetch(request){calls.push(request);return Response.json({ok:true},{headers:{ETag:'"42"','Set-Cookie':'private=must-not-return'}})}},ASSETS:{fetch:async()=>new Response('marketing asset')}}}};
test('marketing assets remain separate; account pages have no analytics and strict security headers',async()=>{
 const {env,calls}=fixture();assert.equal(await (await worker.fetch(req('/'),env)).text(),'marketing asset');
 for(const path of ['/account/register','/account/setup','/account/connector','/account/permissions']){const response=await worker.fetch(req(path),env);assert.equal(response.status,200);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');const html=await response.text();assert.ok(!html.includes('analytics.js'));assert.ok(!html.includes('posthog'))}
 assert.equal(calls.length,0);
});
test('Web proxy preserves request contracts while isolating cookies and enforcing same-origin writes',async()=>{
 const {env,calls}=fixture();
 const headers={Origin:'https://admin.openplayx.com',Cookie:'marketing=private','Cf-Access-Jwt-Assertion':'edge-jwt',Authorization:'Bearer account','X-Admin-Request':'1','Idempotency-Key':'create-1','If-Match':'"42"','Content-Type':'application/json'};
 const response=await adminWorker.fetch(req('/v1/adminzzz/relay/nodes',{method:'POST',headers,body:'{"name":"node"}'}),env);
 assert.equal(response.status,200);assert.equal(calls[0].url,'https://api.openplayx.com/v1/adminzzz/relay/nodes');assert.equal(calls[0].headers.get('Origin'),'https://api.openplayx.com');assert.equal(calls[0].headers.get('Cookie'),null);assert.equal(calls[0].headers.get('Cf-Access-Jwt-Assertion'),'edge-jwt');assert.equal(calls[0].headers.get('Idempotency-Key'),'create-1');assert.equal(calls[0].headers.get('If-Match'),'"42"');assert.equal(await calls[0].text(),'{"name":"node"}');assert.equal(response.headers.get('Set-Cookie'),null);assert.equal(response.headers.get('ETag'),'"42"');
 for(const Origin of ['https://evil.test',null]){const h={...headers};if(Origin)h.Origin=Origin;else delete h.Origin;assert.equal((await adminWorker.fetch(req('/v1/adminzzz/relay/nodes',{method:'POST',headers:h,body:'{}'}),env)).status,403)}
 assert.equal(calls.length,1);
});
test('admin pages and assets require a validated API identity even outside Access protected domains',async()=>{
 let calls=0;const env={API:{fetch:async request=>{calls++;assert.equal(new URL(request.url).pathname,'/v1/adminzzz/session');return request.headers.has('Cf-Access-Jwt-Assertion')?Response.json({actor:{email:'owner@example.com'}}):Response.json({error:{code:'admin_login_required'}},{status:401})}}};
 assert.equal((await adminWorker.fetch(req('/adminzzz/relay'),env)).status,401);
 const response=await adminWorker.fetch(req('/adminzzz/relay',{headers:{'Cf-Access-Jwt-Assertion':'edge-jwt'}}),env);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/html/);assert.equal(calls,2);
});
test('proxy rejects arbitrary, machine-bootstrap and LLM paths; provider failures never turn into HTML',async()=>{
 const {env,calls}=fixture();for(const path of ['/v1/llm/chat/completions','/v1/adminzzz/bootstrap/node_123','/v1/relay/connector/config','/v1/auth/operator/users'])assert.equal((await worker.fetch(req(path),env)).status,404);assert.equal(calls.length,0);
 for(const upstream of [new Response('private HTML',{status:302,headers:{Location:'https://evil.test'}}),new Response('private HTML',{status:200})]){const response=await proxyAPI(req('/v1/adminzzz/session'),{API:{fetch:async()=>upstream}},undefined,'admin');assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private HTML'))}
 assert.equal((await proxyAPI(req('/v1/adminzzz/session'),{},undefined,'admin')).status,503);
});

test('independent Web and admin entrypoints reject each other’s routes',async()=>{
 const {env,calls}=fixture();
 for(const path of ['/adminzzz/relay','/adminzzz/assets/app.js','/v1/adminzzz/session'])assert.equal((await worker.fetch(req(path,{headers:{'Cf-Access-Jwt-Assertion':'edge-jwt'}}),env)).status,404);
 for(const path of ['/v1/auth/login','/v1/relay/me/services','/v1/adminzzz/bootstrap/node_123'])assert.equal((await adminWorker.fetch(req(path),env)).status,404);
 assert.equal(calls.length,0);
 const dashboard=await adminWorker.fetch(req('/',{headers:{'Cf-Access-Jwt-Assertion':'edge-jwt'}}),env);assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/Relay/);
 assert.equal((await adminWorker.fetch(req('/account/register',{headers:{'Cf-Access-Jwt-Assertion':'edge-jwt'}}),env)).status,404);
});

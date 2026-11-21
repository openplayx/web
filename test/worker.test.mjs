import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {proxyAPI} from '../src/api-proxy.mjs';
const req=(path,init={})=>new Request('https://openplayx.com'+path,init);
const fixture=()=>{const calls=[];return {calls,env:{API:{async fetch(request){calls.push(request);return Response.json({status:'accepted'},{status:202,headers:{'Set-Cookie':'private=must-not-return'}})}},ASSETS:{fetch:async()=>new Response('marketing asset')}}}};
test('marketing assets remain separate; account pages have no analytics and strict security headers',async()=>{
 const {env,calls}=fixture();assert.equal(await (await worker.fetch(req('/'),env)).text(),'marketing asset');
 for(const path of ['/account/','/account/login','/account/register','/account/setup','/account/connectors','/account/settings']){const response=await worker.fetch(req(path),env);assert.equal(response.status,200);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');const html=await response.text();assert.ok(!html.includes('analytics.js'));assert.ok(!html.includes('posthog'))}
 assert.equal(calls.length,0);
});
test('only public email-auth requests use the stateless proxy; cookies and credentials never pass through',async()=>{
 const {env,calls}=fixture();const headers={Origin:'https://openplayx.com',Cookie:'private=cookie','Content-Type':'application/json'};
 const response=await worker.fetch(req('/v1/auth/registration/request',{method:'POST',headers,body:'{"email":"fixture@example.com"}'}),env);assert.equal(response.status,202);assert.equal(calls[0].headers.get('Cookie'),null);assert.equal(response.headers.get('Set-Cookie'),null);
 assert.equal((await worker.fetch(req('/v1/auth/registration/request',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:'{}'}),env)).status,403);
 for(const path of ['/v1/auth/login','/v1/auth/refresh','/v1/relay/me/services','/v1/relay/me/devices/device_a/grants'])assert.equal((await worker.fetch(req(path),env)).status,404);
 assert.equal(calls.length,1);
});
test('public Web never serves admin or forwards admin, bootstrap, operator and LLM requests',async()=>{
 const {env,calls}=fixture();for(const path of ['/adminzzz','/adminzzz/relay','/adminzzz/assets/app.js','/v1/adminzzz/session','/v1/adminzzz/relay/nodes','/v1/adminzzz/bootstrap/node_123','/v1/llm/chat/completions','/v1/relay/connector/config','/v1/auth/operator/users'])assert.equal((await worker.fetch(req(path,{headers:{'Cf-Access-Jwt-Assertion':'edge-jwt'}}),env)).status,404);assert.equal(calls.length,0);
});
test('upstream redirects and non-JSON responses never become public HTML',async()=>{
 for(const upstream of [new Response('private HTML',{status:302,headers:{Location:'https://evil.test'}}),new Response('private HTML',{status:200})]){const response=await proxyAPI(req('/v1/auth/registration/request',{method:'POST',headers:{Origin:'https://openplayx.com'},body:'{}'}),{API:{fetch:async()=>upstream}});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private HTML'))}
});
test('health reports the serving Worker version, deployment tag and commit without touching upstreams',async()=>{
 const {env,calls}=fixture();const response=await worker.fetch(req('/health'),{...env,VERSION_METADATA:{id:'version-a',tag:'v1.0.1'},DEPLOY_COMMIT:'a'.repeat(40)});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Worker-Version'),'version-a');assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.deepEqual(await response.json(),{status:'ok',service:'web',tag:'v1.0.1',commit:'a'.repeat(40)});
 assert.equal((await worker.fetch(req('/health',{method:'POST'}),env)).status,405);assert.deepEqual(await (await worker.fetch(req('/health'),env)).json(),{status:'ok',service:'web'});assert.equal(calls.length,0);
});

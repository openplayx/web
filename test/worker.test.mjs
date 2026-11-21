import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {proxyAPI} from '../src/api-proxy.mjs';
const req=(path,init={})=>new Request('https://openplayx.com'+path,init);
const fixture=()=>{const calls=[];return {calls,env:{API:{async fetch(request){calls.push(request);return Response.json({status:'accepted'},{status:202,headers:{'Set-Cookie':'private=must-not-return'}})}},ASSETS:{fetch:async()=>new Response('marketing asset')}}}};
test('marketing assets remain separate; account pages have no analytics and strict security headers',async()=>{
 const {env,calls}=fixture();assert.equal(await (await worker.fetch(req('/ecosystem/'),env)).text(),'marketing asset');
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
const snapshot=JSON.parse(readFileSync(new URL('../content/releases.json',import.meta.url)));
const connectorSnapshot=JSON.parse(readFileSync(new URL('../content/connector-release.json',import.meta.url)));
const retag=(m,tag)=>JSON.parse(JSON.stringify(m).replaceAll(m.tag,tag));
const kv=(values)=>({async get(key,opts){assert.deepEqual(opts,{type:'json',cacheTtl:60});if(values instanceof Error)throw values;return values[key]??null}});
test('release pages and /release.json show the KV manifest without a redeploy',async()=>{
 const {env}=fixture();const next=retag(snapshot,'v9.8.7');next.assets[0].bytes=200*1048576;
 const live={...env,RELEASES:kv({'release/openplayx':next})};
 for(const path of ['/','/zh/','/download/','/zh/download/']){
  const response=await worker.fetch(req(path),live);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/^text\/html/);
  assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);const html=await response.text();
  assert.ok(html.includes('v9.8.7'),path);assert.ok(!html.includes(snapshot.tag),path);
 }
 const download=await (await worker.fetch(req('/download/'),live)).text();assert.ok(download.includes('200 MB'));assert.ok(download.includes(next.assets[0].url));
 assert.equal((await (await worker.fetch(req('/release.json'),live)).json()).tag,'v9.8.7');
 assert.equal((await worker.fetch(req('/download/',{method:'POST'}),live)).status,405);
 assert.equal((await worker.fetch(req('/download/',{method:'HEAD'}),live)).status,200);
});
test('missing, broken or foreign KV manifests fall back to the bundled snapshot',async()=>{
 const {env}=fixture();const foreign=retag(snapshot,'v9.8.7');foreign.assets[0].url='https://evil.test/x.zip';
 const noMac=retag(snapshot,'v9.8.7');noMac.assets=noMac.assets.filter(a=>a.platform!=='macos');
 for(const RELEASES of [undefined,kv({}),kv(new Error('kv down')),kv({'release/openplayx':foreign}),kv({'release/openplayx':noMac}),kv({'release/openplayx':{tag:'<script>'}})]){
  const html=await (await worker.fetch(req('/download/'),{...env,RELEASES})).text();assert.ok(html.includes(snapshot.tag));assert.ok(!html.includes('v9.8.7'));assert.ok(!html.includes('evil.test'));
 }
});
test('the account center offers the Connector packages of the KV manifest',async()=>{
 const {env}=fixture();const next=retag(connectorSnapshot,'v7.7.7');
 const live=await (await worker.fetch(req('/account/assets/account.js'),{...env,RELEASES:kv({'release/connector':next})})).text();
 assert.ok(live.includes('"tag":"v7.7.7"'));assert.ok(!live.includes(`"tag":"${connectorSnapshot.tag}"`));
 const fallback=await (await worker.fetch(req('/account/assets/account.js'),env)).text();assert.ok(fallback.includes(`"tag":"${connectorSnapshot.tag}"`));
});

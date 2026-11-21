import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {adminFixture} from '../test/admin-fixture.mjs';
import {adminUIIntegration} from '../test/admin-ui-integration.mjs';
const folder=new URL('../.wrangler/web-integration/',import.meta.url);await mkdir(folder,{recursive:true});
const scriptPath=new URL('worker.mjs',folder).pathname;
await build({entryPoints:[new URL('../src/worker.mjs',import.meta.url).pathname],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:scriptPath});
const fixture=adminFixture();let registration;
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'web-test',modules:true,scriptPath,compatibilityDate:'2026-11-15',serviceBindings:{
 ASSETS:async()=>new Response('existing marketing assets'),
 API:async request=>{
  const path=new URL(request.url).pathname;
  if(path==='/v1/auth/registration/request'){
   assert.equal(request.headers.get('Origin'),'https://api.openplayx.com');assert.equal(request.headers.get('Cookie'),null);registration=await request.json();return Response.json({status:'accepted'},{status:202});
  }
  return fixture.env.API.fetch(request);
 }
}}]}));
try{
 for(const path of ['/account/register','/account/connector','/account/permissions']){const response=await mf.dispatchFetch('https://openplayx.com'+path);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/html/);assert.ok(!(await response.text()).includes('analytics.js'))}
 assert.equal((await mf.dispatchFetch('https://openplayx.com/adminzzz/relay')).status,401);
 const response=await mf.dispatchFetch('https://openplayx.com/v1/auth/registration/request',{method:'POST',headers:{Origin:'https://openplayx.com','Content-Type':'application/json',Cookie:'private=must-not-cross'},body:JSON.stringify({email:'fixture@example.com'})});assert.equal(response.status,202);assert.deepEqual(registration,{email:'fixture@example.com'});
 const denied=await mf.dispatchFetch('https://openplayx.com/v1/auth/registration/request',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
 await adminUIIntegration({dispatch:(url,init)=>mf.dispatchFetch(url,init),token:'fixture-edge-jwt',setFault:fixture.setFault,cloudCreates:fixture.cloudCreates});
 assert.equal(fixture.cloudCreates(),1);assert.equal(await (await mf.dispatchFetch('https://openplayx.com/')).text(),'existing marketing assets');
 console.log('workerd Web pages → fixed API service binding: auth, CSRF, streaming JSON, catalog retry and idempotent confirmed creation passed; all upstream calls mocked.');
}finally{await mf.dispose();await rm(folder,{recursive:true,force:true})}

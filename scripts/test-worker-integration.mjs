import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const folder=new URL('../.wrangler/web-integration/',import.meta.url);await mkdir(folder,{recursive:true});
const scriptPath=new URL('worker.mjs',folder).pathname;
const bundle=await build({metafile:true,entryPoints:[new URL('../src/worker.mjs',import.meta.url).pathname],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:scriptPath});
assert.ok(!Object.keys(bundle.metafile.inputs).some(path=>/admin(?:-ui|-worker)?\.mjs$/.test(path)),'Public Web bundle must not contain admin pages');
let registration;
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'web-test',modules:true,scriptPath,compatibilityDate:'2026-11-15',serviceBindings:{
 ASSETS:async()=>new Response('existing marketing assets'),
 API:async request=>{
  assert.equal(request.url,'https://api.openplayx.com/v1/auth/registration/request');assert.equal(request.headers.get('Origin'),'https://api.openplayx.com');assert.equal(request.headers.get('Cookie'),null);registration=await request.json();return Response.json({status:'accepted'},{status:202});
 }
}}]}));
try{
 for(const path of ['/account/','/account/register','/account/connector','/account/permissions']){const response=await mf.dispatchFetch('https://openplayx.com'+path);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/html/);assert.ok(!(await response.text()).includes('analytics.js'))}
 for(const path of ['/adminzzz/relay','/adminzzz/assets/app.js','/v1/adminzzz/session'])assert.equal((await mf.dispatchFetch('https://openplayx.com'+path)).status,404);
 const response=await mf.dispatchFetch('https://openplayx.com/v1/auth/registration/request',{method:'POST',headers:{Origin:'https://openplayx.com','Content-Type':'application/json',Cookie:'private=must-not-cross'},body:JSON.stringify({email:'fixture@example.com'})});assert.equal(response.status,202);assert.deepEqual(registration,{email:'fixture@example.com'});
 const denied=await mf.dispatchFetch('https://openplayx.com/v1/auth/registration/request',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
 assert.equal(await (await mf.dispatchFetch('https://openplayx.com/')).text(),'existing marketing assets');
 console.log('Public Web workerd: account pages, JSON service binding, cookie isolation, CSRF and admin route rejection passed. Admin is maintained in the separate private repository.');
}finally{await mf.dispose();await rm(folder,{recursive:true,force:true})}

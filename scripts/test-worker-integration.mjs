import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {accountUIIntegration} from '../test/account-ui-integration.mjs';
const folder=new URL('../.wrangler/web-integration/',import.meta.url);await mkdir(folder,{recursive:true});const scriptPath=new URL('worker.mjs',folder).pathname;
const bundle=await build({metafile:true,entryPoints:[new URL('../src/worker.mjs',import.meta.url).pathname],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:scriptPath});
assert.ok(!Object.keys(bundle.metafile.inputs).some(path=>/admin(?:-ui|-worker)?\.mjs$/.test(path)),'Public Web bundle must not contain admin pages');
let registration,logins=0;const profile={userId:'user_fixture',email:'fixture@example.com',displayName:'Fixture',emailVerifiedAt:'2026-01-01'};
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'web-test',modules:true,scriptPath,compatibilityDate:'2026-11-15',durableObjects:{ACCOUNT_SESSIONS:{className:'AccountSession',useSQLite:true}},serviceBindings:{
 ASSETS:async()=>new Response('existing marketing assets'),
 API:async request=>{
  const path=new URL(request.url).pathname;assert.equal(new URL(request.url).origin,'https://api.openplayx.com');assert.equal(request.headers.get('Cookie'),null);
  if(path==='/v1/auth/registration/request'){registration=await request.json();return Response.json({status:'accepted'},{status:202});}
  if(path==='/v1/auth/login'){const body=await request.json();assert.equal(body.clientType,'web');logins++;return Response.json({accessToken:'private-access-'+logins,refreshToken:'private-refresh-'+logins,expiresIn:900});}
  assert.match(request.headers.get('Authorization'),/^Bearer private-access-/);
  if(path==='/v1/auth/me')return Response.json(profile,{headers:{ETag:'"account:fixture:1"'}});
  if(path==='/v1/auth/logout')return Response.json({status:'logged_out'});
  if(path==='/v1/relay/me/connectors')return Response.json({items:[{connectorId:'connector_fixture',name:'Fixture VM',status:'enabled'}],revision:'10',nextCursor:null});
  if(path==='/v1/relay/me/services')return Response.json({items:[{serviceId:'service_fixture',connectorId:'connector_fixture',name:'Fixture SMB',type:'smb',status:'enabled'}],revision:'10',nextCursor:null});
  throw Error('Unexpected mock API request '+path);
 }
}}]}));
try{
 for(const path of ['/account/','/account/login','/account/register','/account/connectors','/account/settings']){const response=await mf.dispatchFetch('https://openplayx.com'+path);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/html/);assert.ok(!(await response.text()).includes('analytics.js'))}
 for(const path of ['/adminzzz/relay','/v1/adminzzz/session','/account/permissions'])assert.equal((await mf.dispatchFetch('https://openplayx.com'+path)).status,404);
 const response=await mf.dispatchFetch('https://openplayx.com/v1/auth/registration/request',{method:'POST',headers:{Origin:'https://openplayx.com','Content-Type':'application/json',Cookie:'private=must-not-cross'},body:JSON.stringify({email:'fixture@example.com'})});assert.equal(response.status,202);assert.deepEqual(registration,{email:'fixture@example.com'});
 const denied=await mf.dispatchFetch('https://openplayx.com/account/api/login',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
 const login=await mf.dispatchFetch('https://openplayx.com/account/api/login',{method:'POST',headers:{Origin:'https://openplayx.com','Content-Type':'application/json'},body:JSON.stringify({email:profile.email,password:'fixture-password-123'})});assert.equal(login.status,200);const set=login.headers.get('Set-Cookie'),cookie=set.split(';')[0];assert.match(set,/HttpOnly/);assert.ok(!(await login.text()).includes('private-access'));
 const id=cookie.split('=')[1],hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))).toString('hex');await mf.unsafeEvictDurableObject('web-test','AccountSession',{name:hash});
 const session=await mf.dispatchFetch('https://openplayx.com/account/api/session',{headers:{Cookie:cookie}});assert.equal((await session.json()).user.userId,profile.userId);
 assert.equal((await mf.dispatchFetch('https://openplayx.com/account/api/services/service_fixture',{method:'DELETE',headers:{Cookie:cookie,Origin:'https://openplayx.com','Content-Type':'application/json'},body:'{}'})).status,404);
 await accountUIIntegration((url,init)=>mf.dispatchFetch(url,init));assert.equal(await (await mf.dispatchFetch('https://openplayx.com/')).text(),'existing marketing assets');
 console.log('workerd + persistent account session + browser DOM: separate login, reload recovery, opaque credentials, read-only services, CSRF, logout and admin isolation passed; API and emails mocked.');
}finally{await mf.dispose();await rm(folder,{recursive:true,force:true})}

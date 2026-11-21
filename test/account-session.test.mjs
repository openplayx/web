import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountSession,accountSessionAPI} from '../src/account-session.mjs';
function harness(){
 const objects=new Map(),calls=[];let token=0,refreshes=0;const profile={userId:'user_fixture',email:'fixture@example.com',displayName:'Fixture',emailVerifiedAt:'2026-01-01'};
 const API={fetch:async request=>{const path=new URL(request.url).pathname,body=request.method==='GET'?undefined:await request.json();calls.push({path,method:request.method,body,headers:request.headers});assert.equal(new URL(request.url).origin,'https://api.openplayx.com');assert.equal(request.headers.get('Cookie'),null);
  if(path==='/v1/auth/login'){assert.equal(body.clientType,'web');if(body.password!=='fixture-password-123')return Response.json({error:{code:'invalid_login'}},{status:401});token++;return Response.json({accessToken:'private-access-'+token,refreshToken:'private-refresh-'+token,expiresIn:900});}
  if(path==='/v1/auth/refresh'){refreshes++;token++;return Response.json({accessToken:'private-access-'+token,refreshToken:'private-refresh-'+token,expiresIn:900});}
  if(path==='/v1/auth/logout')return Response.json({status:'logged_out'});
  assert.match(request.headers.get('Authorization'),/^Bearer private-access-/);
  if(path==='/v1/auth/me')return Response.json(profile,{headers:{ETag:'"account:user_fixture:1"'}});
  if(path==='/v1/relay/me/connector-bindings/approve')return Response.json({status:'approved',name:'Fixture VM'});
  if(request.method==='DELETE')return Response.json({operationId:'operation_fixture',status:'pending',revision:'8'},{status:202});
  return Response.json({items:[],revision:'7',nextCursor:null});
 }};
 const env={ACCOUNT_SESSIONS:{idFromName:name=>name,get:key=>{if(!objects.has(key)){const store=new Map();let tail=Promise.resolve();const ctx={storage:{get:async k=>store.get(k),put:async(k,v)=>store.set(k,structuredClone(v)),deleteAll:async()=>store.clear(),setAlarm:async()=>{},deleteAlarm:async()=>{}},blockConcurrencyWhile:fn=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;}};objects.set(key,{store,worker:new AccountSession(ctx,{API})});}return {fetch:request=>objects.get(key).worker.fetch(request)};}}};
 const request=(path,{method='GET',body,cookie,origin='https://openplayx.com',headers={}}={})=>accountSessionAPI(new Request('https://openplayx.com/account/api'+path,{method,headers:{...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
 async function login(){const response=await request('/login',{method:'POST',body:{email:profile.email,password:'fixture-password-123',clientType:'operator'}});assert.equal(response.status,200);return {response,cookie:response.headers.get('Set-Cookie').split(';')[0]};}
 return {objects,calls,request,login,refreshes:()=>refreshes};
}
test('opaque HttpOnly cookie owns server-side credentials; browser responses and upstream cookies contain no tokens',async()=>{
 const h=harness();assert.deepEqual(await (await h.request('/session')).json(),{authenticated:false});const {response,cookie}=await h.login();const set=response.headers.get('Set-Cookie');assert.match(set,/^__Host-opx-account=[a-f0-9]{64}; Path=\/; Secure; HttpOnly; SameSite=Lax/);const body=await response.text();assert.ok(!body.includes('private-access'));assert.ok(!body.includes('refreshToken'));
 const session=await h.request('/session',{cookie});assert.equal((await session.json()).user.userId,'user_fixture');assert.equal((await h.request('/services',{cookie})).status,200);assert.equal((await h.request('/connectors',{cookie})).status,200);
 for(const [path,method] of [['/services','POST'],['/services/service_a','PATCH'],['/devices/device_a/grants','PUT'],['/adminzzz/session','GET']])assert.equal((await h.request(path,{cookie,method,body:method==='GET'?undefined:{}})).status,404);
 assert.equal((await h.request('/connectors/connector_fixture',{cookie,method:'DELETE',body:{},headers:{'If-Match':'"7"'}})).status,202);
 assert.equal(h.calls.at(-1).headers.get('If-Match'),'"7"');
});
test('cross-origin writes fail before authentication and bad login never creates a stored session',async()=>{
 const h=harness();for(const origin of ['https://evil.test','https://admin.openplayx.com','null'])assert.equal((await h.request('/login',{method:'POST',origin,body:{email:'fixture@example.com',password:'fixture-password-123'}})).status,403);
 assert.equal(h.calls.length,0);assert.equal((await h.request('/login',{method:'POST',body:{email:'fixture@example.com',password:'wrong-password-123'}})).status,401);assert.ok([...h.objects.values()].every(o=>!o.store.get('session')));
 assert.equal((await h.request('/services')).status,401);
});
test('concurrent requests refresh exactly once and logout removes only this Web session',async()=>{
 const h=harness();const first=await h.login(),other=await h.login();const stores=[...h.objects.values()];const expired=stores[0].store.get('session');expired.accessExpiresAt=0;stores[0].store.set('session',expired);
 const responses=await Promise.all([h.request('/services',{cookie:first.cookie}),h.request('/connectors',{cookie:first.cookie})]);assert.ok(responses.every(r=>r.status===200));assert.equal(h.refreshes(),1);
 const logout=await h.request('/logout',{method:'POST',cookie:first.cookie,body:{}});assert.equal(logout.status,200);assert.match(logout.headers.get('Set-Cookie'),/Max-Age=0/);assert.deepEqual(await (await h.request('/session',{cookie:first.cookie})).json(),{authenticated:false});assert.equal((await h.request('/session',{cookie:other.cookie})).status,200);assert.ok(stores[1].store.get('session'));
});
test('Connector pre-registration routes map to the Relay enrollment API only',async()=>{
 const h=harness();const {cookie}=await h.login();
 assert.equal((await h.request('/connectors/enrollments',{cookie})).status,200);assert.equal(h.calls.at(-1).path,'/v1/relay/me/connector-enrollments');
 assert.equal((await h.request('/connectors/enrollments',{cookie,method:'POST',body:{name:'NAS'}})).status,200);assert.deepEqual([h.calls.at(-1).path,h.calls.at(-1).method,h.calls.at(-1).body],['/v1/relay/me/connector-enrollments','POST',{name:'NAS'}]);
 assert.equal((await h.request('/connectors/enrollments/enrollment_abc-1',{cookie,method:'DELETE',body:{}})).status,202);assert.equal(h.calls.at(-1).path,'/v1/relay/me/connector-enrollments/enrollment_abc-1');
 const before=h.calls.length;
 for(const [path,method] of [['/connectors/enrollments','DELETE'],['/connectors/enrollments/enrollment_a','GET'],['/connectors/enrollments/connector_a','DELETE'],['/connectors/enrollments/enrollment_a/x','DELETE']]){const r=await h.request(path,{cookie,method,body:method==='GET'?undefined:{}});if(r.status!==404)assert.notEqual(h.calls.at(-1).path.includes('connector-enrollments'),true,path);}
 assert.ok(h.calls.slice(before).every(c=>!c.path.includes('connector-enrollments')));
});

const API_ORIGIN='https://api.openplayx.com';
const COOKIE='__Host-opx-account';
const LIFE=30*86400;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{...headers,...extra}});
const error=(code,status)=>json({error:{code}},status);
const cookie=(value,age=LIFE)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
function sessionId(request){const items=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));if(items.length!==1)return null;const value=items[0].slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(value)?value:null;}
async function object(env,id){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));const key=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');return env.ACCOUNT_SESSIONS.get(env.ACCOUNT_SESSIONS.idFromName(key));}
function endpoint(path,method){
 if(path==='/session'&&method==='GET')return '/v1/auth/me';
 if(path==='/profile'&&['GET','PATCH'].includes(method))return '/v1/auth/me';
 if(['/services','/connectors','/devices'].includes(path)&&method==='GET')return '/v1/relay/me'+path;
 if(path==='/connectors/approve'&&method==='POST')return '/v1/relay/me/connector-bindings/approve';
 if(/^\/(connectors|devices)\/[A-Za-z0-9_-]{1,100}$/.test(path)&&method==='DELETE')return '/v1/relay/me'+path;
 if(/^\/operations\/operation_[A-Za-z0-9_-]{1,100}$/.test(path)&&method==='GET')return '/v1/relay'+path;
 return null;
}
export async function accountSessionAPI(request,env){
 const url=new URL(request.url),path=url.pathname.slice('/account/api'.length),write=!['GET','HEAD'].includes(request.method);
 if(!['/login','/logout'].includes(path)&&!endpoint(path,request.method))return error('not_found',404);
 if(['/login','/logout'].includes(path)&&request.method!=='POST')return error('method_not_allowed',405);
 if(write&&(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return error('origin_not_allowed',403);
 if(write&&!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return error('json_required',415);
 if(!env.ACCOUNT_SESSIONS)return error('account_unavailable',503);
 let body;
 if(write){if(Number(request.headers.get('Content-Length'))>4096)return error('request_too_large',413);body=await request.text();if(new TextEncoder().encode(body).length>4096)return error('request_too_large',413);try{const value=JSON.parse(body);if(!value||Array.isArray(value)||typeof value!=='object')throw Error();}catch{return error('invalid_request',400);}}
 const oldId=sessionId(request);
 if(!oldId&&path!=='/login')return path==='/session'?json({authenticated:false}):path==='/logout'?json({status:'logged_out'},200,{'Set-Cookie':cookie('',0)}):error('session_expired',401);
 const id=path==='/login'?Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''):oldId;
 const internal=new URL(path,'https://account.internal');internal.search=url.search;
 const forwarded=new Headers();for(const name of ['Content-Type','If-Match','CF-Connecting-IP']){const value=request.headers.get(name);if(value!==null)forwarded.set(name,value);}
 try{
  const stub=await object(env,id);const response=await stub.fetch(new Request(internal,{method:request.method,headers:forwarded,...(body!==undefined?{body}:{})}));
  const output=new Headers(response.headers);
  if(path==='/login'&&response.ok){output.set('Set-Cookie',cookie(id));if(oldId&&oldId!==id){try{await (await object(env,oldId)).fetch(new Request('https://account.internal/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));}catch{/* New login is valid; the former opaque cookie is no longer used. */}}}
  if((path==='/logout'&&response.ok)||response.status===401)output.set('Set-Cookie',cookie('',0));
  return new Response(response.body,{status:response.status,headers:output});
 }catch{return error('account_unavailable',503)}
}
export class AccountSession {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){return this.ctx.blockConcurrencyWhile(()=>this.handle(request));}
 async upstream(path,method='GET',body,token,match,ip){
  const h=new Headers({'Accept':'application/json','Content-Type':'application/json'});if(token)h.set('Authorization','Bearer '+token);if(match)h.set('If-Match',match);if(ip)h.set('CF-Connecting-IP',ip);
  try{const response=await this.env.API.fetch(new Request(new URL(path,API_ORIGIN),{method,headers:h,redirect:'manual',signal:AbortSignal.timeout(10000),...(body!==undefined?{body:JSON.stringify(body)}:{})}));
   if(!response.headers.get('Content-Type')?.includes('application/json'))return {response:error('account_unavailable',503)};
   const data=await response.json();if(!response.ok){const code=data?.error?.code;return {response:error(typeof code==='string'&&/^[a-z0-9_]{1,80}$/.test(code)?code:'request_failed',response.status)};}
   return {data,etag:response.headers.get('ETag'),status:response.status};
  }catch{return {response:error('account_unavailable',503)}}
 }
 async clear(){await this.ctx.storage.deleteAll();await this.ctx.storage.deleteAlarm();}
 async handle(request){
  const url=new URL(request.url),path=url.pathname,ip=request.headers.get('CF-Connecting-IP');
  if(path==='/login'&&request.method==='POST'){
   const body=await request.json();if(typeof body.email!=='string'||typeof body.password!=='string'||body.email.length>254||body.password.length>128)return error('invalid_request',400);
   const login=await this.upstream('/v1/auth/login','POST',{email:body.email,password:body.password,clientType:'web'},null,null,ip);if(login.response)return login.response;
   if(typeof login.data.accessToken!=='string'||typeof login.data.refreshToken!=='string')return error('account_unavailable',503);
   const profile=await this.upstream('/v1/auth/me','GET',undefined,login.data.accessToken,null,ip);
   if(profile.response){await this.upstream('/v1/auth/logout','POST',{},login.data.accessToken,null,ip);return profile.response;}
   const s={accessToken:login.data.accessToken,refreshToken:login.data.refreshToken,accessExpiresAt:Date.now()+Number(login.data.expiresIn||900)*1000,expiresAt:Date.now()+LIFE*1000};await this.ctx.storage.put('session',s);await this.ctx.storage.setAlarm(s.expiresAt);
   return json({authenticated:true,user:profile.data,profileETag:profile.etag});
  }
  let s=await this.ctx.storage.get('session');
  if(!s||s.expiresAt<=Date.now()){await this.clear();return path==='/session'?json({authenticated:false}):error('session_expired',401);}
  if(path==='/logout'&&request.method==='POST'){
   const result=await this.upstream('/v1/auth/logout','POST',{},s.accessToken,null,ip);
   // Keep the session for an explicit retry if revocation failed transiently.
   if(result.response&&result.response.status!==401)return result.response;
   await this.clear();return json({status:'logged_out'});
  }
  if(s.accessExpiresAt<=Date.now()+30000){
   const refreshed=await this.upstream('/v1/auth/refresh','POST',{refreshToken:s.refreshToken},null,null,ip);
   if(refreshed.response){await this.clear();return error('session_expired',401);}
   if(typeof refreshed.data.accessToken!=='string'||typeof refreshed.data.refreshToken!=='string'){await this.clear();return error('session_expired',401);}
   s={...s,accessToken:refreshed.data.accessToken,refreshToken:refreshed.data.refreshToken,accessExpiresAt:Date.now()+Number(refreshed.data.expiresIn||900)*1000};await this.ctx.storage.put('session',s);
  }
  const target=endpoint(path,request.method);if(!target)return error('not_found',404);
  const query=new URLSearchParams();for(const name of ['limit','cursor'])if(url.searchParams.has(name))query.set(name,url.searchParams.get(name));
  const body=['POST','PATCH','DELETE'].includes(request.method)?await request.json():undefined;
  const result=await this.upstream(target+(query.size?'?'+query:''),request.method,body,s.accessToken,request.headers.get('If-Match'),ip);
  if(result.response){if(result.response.status===401)await this.clear();return result.response;}
  return json(path==='/session'?{authenticated:true,user:result.data,profileETag:result.etag}:result.data,result.status||200,result.etag?{ETag:result.etag}:{});
 }
 async alarm(){await this.clear();}
}

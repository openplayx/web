import {pageResponse} from './pages/index.mjs';
const API_ORIGIN='https://api.openplayx.com';
const json=(code,status)=>Response.json({error:{code}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function allowedRoute(path){
 if(/^\/v1\/adminzzz(?:\/|$)/.test(path)&&!/^\/v1\/adminzzz\/bootstrap(?:\/|$)/.test(path))return true;
 if(/^\/v1\/auth\/(?:registration\/(?:request|complete)|verify-email|login|logout|password-reset\/(?:request|confirm))$/.test(path))return true;
 return /^\/v1\/relay\/me\/(?:devices|services|connector-bindings\/approve|devices\/[^/]+\/grants)$/.test(path);
}
export async function proxyAPI(request,env,path=new URL(request.url).pathname){
 if(!allowedRoute(path))return json('not_found',404);
 if(!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(request.method))return json('method_not_allowed',405);
 const browser=new URL(request.url),write=!['GET','HEAD'].includes(request.method);
 // Browser cookies stay on Web. Only API credentials and edge-verified Access
 // assertions cross the fixed service binding; incoming Origin is verified first.
 if(write&&(request.headers.get('Origin')!==browser.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json('origin_not_allowed',403);
 if(!env.API?.fetch)return json('api_unavailable',503);
 const headers=new Headers();
 for(const key of ['Authorization','Content-Type','Accept','Cf-Access-Jwt-Assertion','CF-Connecting-IP','X-Admin-Request','Idempotency-Key','If-Match','If-None-Match']){const value=request.headers.get(key);if(value!==null)headers.set(key,value)}
 if(write)headers.set('Origin',API_ORIGIN);
 const target=new URL(path,API_ORIGIN);target.search=browser.search;
 try{
  const response=await env.API.fetch(new Request(target,{method:request.method,headers,redirect:'manual',...((request.body&&write)?{body:request.body,duplex:'half'}:{})}));
  if(response.status>=300&&response.status<400&&response.status!==304)return json('api_unavailable',502);
  if(![204,304].includes(response.status)&&request.method!=='HEAD'&&!response.headers.get('Content-Type')?.includes('application/json'))return json('api_unavailable',502);
  const output=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  for(const key of ['Content-Type','ETag','Retry-After','X-Request-Id','X-Worker-Version','X-Deployment-Tag','X-Commit-Sha']){const value=response.headers.get(key);if(value!==null)output.set(key,value)}
  return new Response(response.body,{status:response.status,headers:output});
 }catch{return json('api_unavailable',503)}
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/v1/'))return proxyAPI(request,env);
 if(path==='/adminzzz'||path.startsWith('/adminzzz/')){
  // Access protects production paths at the edge. Validate through API as well
  // so workers.dev or a missing edge policy never exposes an admin session.
  const session=await proxyAPI(new Request(new URL('/v1/adminzzz/session',request.url),{headers:request.headers}),env);
  if(!session.ok)return session;
 }
 const page=pageResponse(request);if(page)return page;
 return env.ASSETS.fetch(request);
}};

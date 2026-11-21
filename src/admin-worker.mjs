import {adminPage} from './pages/admin.mjs';
import {proxyAPI} from './api-proxy.mjs';
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/v1/'))return proxyAPI(request,env,path,'admin');
 const session=await proxyAPI(new Request(new URL('/v1/adminzzz/session',request.url),{headers:request.headers}),env,'/v1/adminzzz/session','admin');
 if(!session.ok)return session;
 return adminPage(request);
}};

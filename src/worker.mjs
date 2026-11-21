import {accountSessionAPI} from './account-session.mjs';
export {AccountSession} from './account-session.mjs';
import {pageResponse} from './pages/index.mjs';
import {proxyAPI} from './api-proxy.mjs';
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/account/api'||path.startsWith('/account/api/'))return accountSessionAPI(request,env);
 if(path.startsWith('/v1/'))return proxyAPI(request,env);
 if(path==='/adminzzz'||path.startsWith('/adminzzz/'))return Response.json({error:{code:'not_found'}},{status:404});
 const page=pageResponse(request);if(page)return page;
 return env.ASSETS.fetch(request);
}};

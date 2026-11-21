import {accountSessionAPI} from './account-session.mjs';
export {AccountSession} from './account-session.mjs';
import {pageResponse} from './pages/index.mjs';
import {proxyAPI} from './api-proxy.mjs';
// Deployment health for Jenkins: the serving Worker version, deployment tag and source commit.
function health(request,env){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(env.VERSION_METADATA?.id)headers['X-Worker-Version']=env.VERSION_METADATA.id;
 if(!['GET','HEAD'].includes(request.method))return Response.json({error:{code:'method_not_allowed'}},{status:405,headers});
 return Response.json({status:'ok',service:'web',...(env.VERSION_METADATA?.tag?{tag:env.VERSION_METADATA.tag}:{}),...(env.DEPLOY_COMMIT?{commit:env.DEPLOY_COMMIT}:{})},{headers});
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/health')return health(request,env);
 if(path==='/account/api'||path.startsWith('/account/api/'))return accountSessionAPI(request,env);
 if(path.startsWith('/v1/'))return proxyAPI(request,env);
 if(path==='/adminzzz'||path.startsWith('/adminzzz/'))return Response.json({error:{code:'not_found'}},{status:404});
 const page=pageResponse(request);if(page)return page;
 return env.ASSETS.fetch(request);
}};

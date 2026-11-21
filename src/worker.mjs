import {docsResponse} from './docs.mjs';
import {accountSessionAPI} from './account-session.mjs';
export {AccountSession} from './account-session.mjs';
import {pageResponse,connectorScriptPath} from './pages/index.mjs';
import {proxyAPI} from './api-proxy.mjs';
import {render,releasePages} from './render.mjs';
import {loadRelease} from './releases.mjs';
// Pages showing the current release are rendered here from the KV manifest (Jenkins
// updates it after a production release); everything else is a static asset.
const sitePaths=new Map(['en','zh'].flatMap(lang=>releasePages.map(page=>[`${lang==='zh'?'/zh':''}/${page?page+'/':''}`,[lang,page]])));
// Same policy as public/_headers, which only applies to static assets.
const siteHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://us.i.posthog.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",'Cache-Control':'public, max-age=60'};
async function releaseResponse(request,env,path){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const release=await loadRelease(env,'app');
 const [body,type]=path==='/release.json'?[JSON.stringify(release,null,2)+'\n','application/json']:[render(...sitePaths.get(path),false,release),'text/html'];
 return new Response(request.method==='HEAD'?null:body,{headers:{...siteHeaders,'Content-Type':type+'; charset=utf-8'}});
}
// Deployment health for Jenkins: the serving Worker version, deployment tag and source commit.
function health(request,env){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(env.VERSION_METADATA?.id)headers['X-Worker-Version']=env.VERSION_METADATA.id;
 if(!['GET','HEAD'].includes(request.method))return Response.json({error:{code:'method_not_allowed'}},{status:405,headers});
 return Response.json({status:'ok',service:'web',...(env.VERSION_METADATA?.tag?{tag:env.VERSION_METADATA.tag}:{}),...(env.DEPLOY_COMMIT?{commit:env.DEPLOY_COMMIT}:{})},{headers});
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/docs'||path.startsWith('/docs/'))return docsResponse(request,env);
 if(path==='/health')return health(request,env);
 if(path==='/account/api'||path.startsWith('/account/api/'))return accountSessionAPI(request,env);
 if(path.startsWith('/v1/'))return proxyAPI(request,env);
 if(path==='/adminzzz'||path.startsWith('/adminzzz/'))return Response.json({error:{code:'not_found'}},{status:404});
 if(path==='/release.json'||sitePaths.has(path))return releaseResponse(request,env,path);
 const page=pageResponse(request,path===connectorScriptPath?await loadRelease(env,'connector'):undefined);if(page)return page;
 return env.ASSETS.fetch(request);
}};

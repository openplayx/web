import {accountAppHTML,accountAppCSS} from './account-app.mjs';
import accountAppJS from './account-app-client.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const pages=new Map();
for(const path of ['/account/','/account/services','/account/connectors','/account/connector','/account/settings','/account/login','/account/register','/account/recover','/account/setup','/account/reset','/account/verify'])pages.set(path,[accountAppHTML,'text/html']);
for(const [path,body,type] of [['/account/assets/account.css',accountAppCSS,'text/css'],['/account/assets/account.js',accountAppJS,'application/javascript']])pages.set(path,[body,type]);
export function pageResponse(request){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/account/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
 const asset=pages.get(path);if(!asset)return new Response('Not found',{status:404,headers});
 return new Response(request.method==='HEAD'?null:asset[0],{headers:{...headers,'Content-Type':asset[1]+'; charset=utf-8'}});
}

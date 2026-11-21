import {html,css,js} from './admin-ui.mjs';
import {accountHTML,accountCSS,accountJS} from './account-ui.mjs';
import {connectorAccountHTML,connectorAccountJS} from './connector-account-ui.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const pages=new Map();
for(const path of ['/account/register','/account/setup','/account/verify','/account/recover','/account/reset'])pages.set(path,[accountHTML,'text/html']);
for(const path of ['/account/connector','/account/permissions'])pages.set(path,[connectorAccountHTML,'text/html']);
for(const path of ['/adminzzz','/adminzzz/relay','/adminzzz/relay/'])pages.set(path,[html,'text/html']);
for(const [path,body,type] of [['/account/assets/app.css',accountCSS,'text/css'],['/account/assets/app.js',accountJS,'application/javascript'],['/account/assets/connector.js',connectorAccountJS,'application/javascript'],['/adminzzz/assets/app.css',css,'text/css'],['/adminzzz/assets/app.js',js,'application/javascript']])pages.set(path,[body,type]);
export function pageResponse(request){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/account/')&&path!=='/adminzzz'&&!path.startsWith('/adminzzz/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
 const asset=pages.get(path);if(!asset)return new Response('Not found',{status:404,headers});
 return new Response(request.method==='HEAD'?null:asset[0],{headers:{...headers,'Content-Type':asset[1]+'; charset=utf-8'}});
}

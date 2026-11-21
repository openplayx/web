import {accountAppHTML,accountAppCSS} from './account-app.mjs';
import accountAppJS from './account-app-client.mjs';
import {snapshots} from '../releases.mjs';
import {connectorReleaseToken} from './account-app-client.mjs';
import {basecoatCSS,themeCSS,themeJS,i18nJS} from '../../ui/ui-kit.mjs';
import accountEN from '../../i18n/en/account.json' with { type: 'json' };
import accountZH from '../../i18n/zh-CN/account.json' with { type: 'json' };
// Account-center dictionaries for ui/opx-i18n.js, from i18n/<locale>/account.json.
export const accountI18nJS='opxI18n.register('+JSON.stringify({'en':{account:accountEN},'zh-CN':{account:accountZH}})+');\n';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const pages=new Map();
for(const path of ['/account/','/account/services','/account/connectors','/account/connector','/account/settings','/account/login','/account/register','/account/recover','/account/setup','/account/reset','/account/verify'])pages.set(path,[accountAppHTML,'text/html']);
for(const [path,body,type] of [['/account/assets/basecoat.css',basecoatCSS,'text/css'],['/account/assets/opx-theme.css',themeCSS,'text/css'],['/account/assets/opx-theme.js',themeJS,'application/javascript'],['/account/assets/opx-i18n.js',i18nJS,'application/javascript'],['/account/assets/i18n.js',accountI18nJS,'application/javascript'],['/account/assets/account.css',accountAppCSS,'text/css'],['/account/assets/account.js',accountAppJS,'application/javascript']])pages.set(path,[body,type]);
export const connectorScriptPath='/account/assets/account.js';
// connectorRelease: the Connector manifest offered for download (Worker passes the KV value).
export function pageResponse(request,connectorRelease=snapshots.connector){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/account/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
 const asset=pages.get(path);if(!asset)return new Response('Not found',{status:404,headers});
 const body=path===connectorScriptPath?asset[0].replace(connectorReleaseToken,()=>JSON.stringify(connectorRelease)):asset[0];
 return new Response(request.method==='HEAD'?null:body,{headers:{...headers,'Content-Type':asset[1]+'; charset=utf-8'}});
}

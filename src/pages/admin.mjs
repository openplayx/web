import {html,css,js} from './admin-ui.mjs';
const pages=new Map([['/',[html,'text/html']],['/adminzzz',[html,'text/html']],['/adminzzz/relay',[html,'text/html']],['/adminzzz/relay/',[html,'text/html']],['/adminzzz/assets/app.css',[css,'text/css']],['/adminzzz/assets/app.js',[js,'application/javascript']]]);
export function adminPage(request){
 const asset=pages.get(new URL(request.url).pathname);
 if(!asset)return Response.json({error:{code:'not_found'}},{status:404});
 if(!['GET','HEAD'].includes(request.method))return Response.json({error:{code:'method_not_allowed'}},{status:405});
 return new Response(request.method==='HEAD'?null:asset[0],{headers:{'Content-Type':asset[1]+'; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}});
}

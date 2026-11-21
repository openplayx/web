// Limit Docusaurus routing and CSP to its own subtree. Never use the marketing
// site's 404 for a missing document, or return a successful SPA shell for it.
export const docsCSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://us.i.posthog.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
export async function docsResponse(request,env){
 const url=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 if(url.pathname==='/docs') {url.pathname='/docs/';return Response.redirect(url,308);}
 let response=await env.ASSETS.fetch(request);
 if(response.status===404){
  url.pathname=url.pathname.startsWith('/docs/zh-Hans/')?'/docs/zh-Hans/404.html':'/docs/404.html';url.search='';
  const missing=await env.ASSETS.fetch(new Request(url,{method:'GET'}));
  response=new Response(request.method==='HEAD'?null:missing.body,{status:404,headers:missing.headers});
 }
 const headers=new Headers(response.headers);
 headers.set('Content-Security-Policy',docsCSP);
 headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 headers.set('X-Frame-Options','DENY');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 const hashed=/^\/docs\/(?:zh-Hans\/)?assets\//.test(url.pathname)||/search-index-[a-f0-9]+\.json$/.test(url.pathname);
 headers.set('Cache-Control',response.status===200&&hashed?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate');
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
}

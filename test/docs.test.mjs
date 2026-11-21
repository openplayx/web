import test from 'node:test';
import assert from 'node:assert/strict';
import {docsResponse} from '../src/docs.mjs';
const req=(path,method='GET')=>new Request('https://openplayx.com'+path,{method});
test('docs missing pages use localized 404 and never a marketing SPA response',async()=>{
 const paths=[];
 const env={ASSETS:{async fetch(request){const path=new URL(request.url).pathname;paths.push(path);return new Response(path.endsWith('/404.html')?'docs missing':'marketing missing',{status:path.endsWith('/404.html')?200:404,headers:{'Content-Type':'text/html'}})}}};
 const response=await docsResponse(req('/docs/zh-Hans/no-such-article/?token=private'),env);
 assert.equal(response.status,404);assert.equal(await response.text(),'docs missing');assert.deepEqual(paths,['/docs/zh-Hans/no-such-article/','/docs/zh-Hans/404.html']);
 assert(!response.headers.get('Content-Security-Policy').includes("script-src 'self' 'unsafe-inline'"));
 assert.equal((await docsResponse(req('/docs/nope/','HEAD'),env)).body,null);
});
test('docs canonical redirect, methods, assets and HTML cache policies',async()=>{
 assert.equal((await docsResponse(req('/docs'),{})).headers.get('Location'),'https://openplayx.com/docs/');
 assert.equal((await docsResponse(req('/docs/','POST'),{})).status,405);
 const env={ASSETS:{fetch:async()=>new Response('static')}};
 assert.match((await docsResponse(req('/docs/assets/js/main.abc.js'),env)).headers.get('Cache-Control'),/immutable/);
 assert.match((await docsResponse(req('/docs/sources/smb/'),env)).headers.get('Cache-Control'),/must-revalidate/);
});

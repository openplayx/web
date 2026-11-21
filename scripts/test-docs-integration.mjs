import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname;
await readFile(root+'dist/docs/index.html'); // Fail early if assembly was skipped.
// Wrangler's local assets server is required to test actual routing/_headers.
// Run Wrangler as a child and use an ephemeral explicit test port.
import {spawn} from 'node:child_process';
const port=Number(process.env.OPX_DOCS_TEST_PORT||8797);
const child=spawn(process.execPath,[root+'node_modules/wrangler/bin/wrangler.js','dev','--ip','127.0.0.1','--port',String(port),'--local','--show-interactive-dev-session=false'],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
const origin=`http://127.0.0.1:${port}`;
try {
 let ready=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error(log);
  try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 assert(ready,log);
 for(const prefix of ['/docs/','/docs/zh-Hans/']){
  for(const route of ['','sources/smb/','ai/models/','ai/mcp/','remote-access/connector/']){
   const response=await fetch(origin+prefix+route);assert.equal(response.status,200,prefix+route);
   assert.match(response.headers.get('Content-Security-Policy'),/script-src 'self';/);
   const html=await response.text();assert.match(html,/OpenPlayX/);
   for(const [,asset] of html.matchAll(/(?:src|href)="(\/docs\/[^\"]+\.(?:js|css|svg|png))"/g)){
    const res=await fetch(origin+asset);assert.equal(res.status,200,asset);assert(!res.headers.get('Content-Type')?.startsWith('text/html'),asset);
   }
  }
  const missing=await fetch(origin+prefix+'missing-doc/');assert.equal(missing.status,404);assert.match(await missing.text(),/Page Not Found|找不到|未找到/);
  assert.equal((await fetch(origin+prefix+'missing-doc/',{method:'HEAD'})).status,404);
 }
 for(const path of ['/','/zh/','/download/','/account/','/health'])assert.equal((await fetch(origin+path)).status,200,path);
 assert(!(await (await fetch(origin+'/')).text()).includes("style-src 'self' 'unsafe-inline'"));
 console.log('Actual Workers Static Assets: bilingual deep routes, JS/CSS/images, localized 404, headers and website routes passed.');
} finally {child.kill('SIGTERM');if(child.exitCode===null && child.signalCode===null) await new Promise(resolve=>child.once('exit',resolve));}

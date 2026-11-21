import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {pageResponse,accountI18nJS} from '../src/pages/index.mjs';
import {i18nJS} from '../ui/ui-kit.mjs';
import {accountAppHTML} from '../src/pages/account-app.mjs';
import accountJS from '../src/pages/account-app-client.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('UI did not settle');}
function page(path,authenticated=false,override,languages=['zh-CN']){
 const dom=new JSDOM(accountAppHTML,{url:'https://openplayx.com/account/'+path,runScripts:'outside-only'});const w=dom.window,calls=[];let logged=authenticated;
 const user={userId:'user_a',email:'owner@example.com',displayName:'Owner',emailVerifiedAt:'2026-01-01'};
 w.setInterval=()=>0;w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 w.fetch=async(url,init={})=>{const call={url,...init,body:init.body?JSON.parse(init.body):undefined};calls.push(call);const response=override?.(call);if(response)return response;
 const path=new URL(url,w.location.origin).pathname;let data;
 if(path==='/account/api/session')data=logged?{authenticated:true,user,profileETag:'"account:a:1"'}:{authenticated:false};
 else if(path==='/account/api/login'){logged=true;data={authenticated:true,user,profileETag:'"account:a:1"'};}
 else if(path==='/account/api/logout'){logged=false;data={status:'logged_out'};}
 else if(path==='/account/api/connectors')data={items:[{connectorId:'connector_a',name:'VM',status:'enabled'}],revision:'42',nextCursor:null};
 else if(path==='/account/api/services')data={items:[{serviceId:'service_a',connectorId:'connector_a',name:'<img src=x onerror=evil()>',type:'smb',status:'enabled'}],revision:'42',nextCursor:null};
 else if(path==='/account/api/devices')data={items:[{deviceId:'device_a',name:'Phone',status:'enabled',platform:'ios'}],revision:'42'};
 else if(path==='/account/api/connectors/approve')data={status:'approved',name:'VM'};
 else data={status:'accepted'};
 return Response.json(data,{headers:{ETag:'"account:a:2"'}});
 };
 Object.defineProperty(w.navigator,'languages',{value:languages,configurable:true});w.eval(i18nJS);w.eval(accountI18nJS);w.eval(accountJS);return {dom,w,calls,field:id=>w.document.getElementById(id),root:w.document.getElementById('account-app')};
}
async function ready(p,title){await until(()=>p.root.querySelector('h1')?.textContent===title&&!p.root.querySelector('button[type=submit]')?.disabled);}
async function submit(p,id='auth-form'){p.field(id).dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();}
const click=(p,action)=>{const b=p.root.querySelector(`[data-action="${action}"]`);assert(b,'missing '+action);b.click();};
test('exact account routes use strict headers; grant page and old scripts are removed',()=>{
 for(const path of ['','login','register','recover','setup','reset','verify','connector','connectors','settings','services','assets/account.js','assets/account.css','assets/basecoat.css','assets/opx-theme.css','assets/opx-theme.js','assets/opx-i18n.js','assets/i18n.js']){const r=pageResponse(new Request('https://openplayx.com/account/'+path));assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);}
 assert.equal(pageResponse(new Request('https://openplayx.com/account/permissions')).status,404);assert.equal(pageResponse(new Request('https://openplayx.com/account/login',{method:'POST'})).status,405);
});
test('guest sees a separate login; login returns to services and exposes no service-management controls',async()=>{
 const p=page('');await ready(p,'欢迎回来');assert.equal(p.w.location.pathname,'/account/login');assert.equal(p.field('account-sidebar').hidden,true);assert.equal(p.field('pairing-code'),null);
 p.field('email').value='owner@example.com';p.field('password').value='owner-password-123';await submit(p);await ready(p,'我的服务');
 assert(p.root.textContent.includes('<img src=x'));assert.equal(p.field('account-content').querySelector('img'),null);assert.equal(p.field('account-sidebar').hidden,false);assert.equal(p.root.querySelector('[data-action="add-service"]'),null);assert.equal(p.root.querySelector('[data-action="devices"]'),null);
 assert(p.calls.every(c=>!c.headers?.Authorization));assert.equal(p.w.localStorage.length,0);assert.equal(p.w.sessionStorage.length,0);
 click(p,'service-detail');assert(p.root.textContent.includes('云端不提供服务编辑'));click(p,'close');click(p,'logout');await ready(p,'欢迎回来');p.dom.window.close();
});
test('registration and recovery have separate email-only forms; setup consumes mail token only on explicit submission',async()=>{
 for(const [path,endpoint] of [['register','/registration/request'],['recover','/password-reset/request']]){const p=page(path);await ready(p,path==='register'?'创建平台账号':'找回密码');assert.equal(p.field('password'),null);p.field('email').value='owner@example.com';await submit(p);await ready(p,'请查收邮件');const sent=p.calls.find(c=>c.method==='POST');assert.equal(sent.url,'/v1/auth'+endpoint);assert.deepEqual(sent.body,{email:'owner@example.com'});p.dom.window.close();}
 for(const [path,endpoint] of [['setup','/registration/complete'],['reset','/password-reset/confirm']]){const token='a'.repeat(43),p=page(path+'#token='+token);await ready(p,path==='setup'?'设置账号密码':'重置账号密码');assert.equal(p.w.location.hash,'');assert.equal(p.calls.filter(c=>c.method==='POST').length,0);p.field('password').value='owner-password-123';p.field('confirm-password').value='different-password-123';await submit(p);assert.equal(p.calls.filter(c=>c.method==='POST').length,0);p.field('confirm-password').value='owner-password-123';await submit(p);await ready(p,'欢迎回来');const sent=p.calls.find(c=>c.method==='POST');assert.equal(sent.url,'/v1/auth'+endpoint);assert.equal(sent.body.token,token);p.dom.window.close();}
});
test('Connector pairing is a logged-in action; approval does not sign out or create browser-owned services',async()=>{
 const p=page('connector#code=ABCDEFGHJK');await ready(p,'欢迎回来');p.field('email').value='owner@example.com';p.field('password').value='owner-password-123';await submit(p);await ready(p,'Connector');assert.equal(p.field('pairing-code').value,'ABCDEFGHJK');await submit(p,'binding-form');
 const approve=p.calls.find(c=>c.url==='/account/api/connectors/approve');assert.deepEqual(approve.body,{userCode:'ABCDEFGHJK'});assert(!p.calls.some(c=>c.url.endsWith('/logout')));assert(p.root.textContent.includes('等待 Connector'));p.dom.window.close();
});
test('failed list fetch is shown as failure, not as an empty account; raw upstream errors stay hidden',async()=>{
 const p=page('',true,c=>c.url.includes('/services?')?Response.json({error:{code:'control_unavailable',message:'private-upstream'}},{status:503}):null);await ready(p,'我的服务');await until(()=>p.root.textContent.includes('暂时无法获取同步结果'));assert(!p.root.textContent.includes('private-upstream'));assert(!p.root.textContent.includes('还没有绑定 Connector'));p.dom.window.close();
});

test('Connector unbind preserves explicit confirmation across recent-password reauthentication',async()=>{
 let attempts=0;const p=page('connectors',true,c=>{
  if(c.url==='/account/api/connectors/connector_a'&&c.method==='DELETE'){attempts++;return attempts===1?Response.json({error:{code:'reauthentication_required'}},{status:403}):Response.json({operationId:'operation_fixture',status:'pending',revision:'43'},{status:202});}
 });await ready(p,'Connector');await until(()=>p.root.querySelector('[data-action="connector-detail"]'));click(p,'connector-detail');click(p,'unbind');p.field('confirm-name').value='VM';await submit(p,'unbind-form');await until(()=>p.field('reauth-password'));p.field('reauth-password').value='owner-password-123';await submit(p,'reauth-form');await until(()=>attempts===2&&p.root.textContent.includes('解除绑定已提交'));assert.equal(attempts,2);p.dom.window.close();
});
test('pre-registration shows package, one-time enrollment file and commands; pending entries can be cancelled',async()=>{
 const token='opxe_'+'T'.repeat(43);let enrollments=[];const blobs=[];
 const p=page('connectors',true,c=>{
  if(c.url==='/account/api/connectors/enrollments'&&c.method==='POST'){const enrollment={enrollmentId:'enrollment_a',name:c.body.name,status:'pending',expiresAt:'2026-12-01T00:00:00.000Z',createdAt:'2026-11-24T00:00:00.000Z'};enrollments=[enrollment];return Response.json({enrollment,enrollmentToken:token},{status:201});}
  if(c.url==='/account/api/connectors/enrollments')return Response.json({items:enrollments});
  if(c.url==='/account/api/connectors/enrollments/enrollment_a'&&c.method==='DELETE'){enrollments=[];return Response.json({status:'revoked'});}
 });
 p.w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:fixture';};p.w.HTMLAnchorElement.prototype.click=function(){};p.w.URL.revokeObjectURL=()=>{};
 await ready(p,'Connector');click(p,'enroll');p.field('enroll-name').value='Home NAS';p.field('enroll-platform').value='linux-arm64';await submit(p,'enroll-form');
 await until(()=>p.root.querySelector('#enroll-result'));
 const create=p.calls.find(c=>c.url==='/account/api/connectors/enrollments'&&c.method==='POST');assert.deepEqual(create.body,{name:'Home NAS'});
 const result=p.root.querySelector('#enroll-result');assert(!result.innerHTML.includes(token),'token rendered into the page');
 const pkg=[...result.querySelectorAll('a.btn')].find(a=>a.href.includes('linux-arm64'));assert(pkg&&pkg.href.startsWith('https://github.com/openplayx/openplayx-connector/releases/download/'));
 assert.match(p.field('enroll-commands').textContent,/sudo \.\/openplayx-connector-[0-9.]+-linux-arm64\/openplayx-connector install --enroll openplayx-connector-enrollment\.json/);
 click(p,'enroll-download');assert.equal(blobs.length,1);const file=JSON.parse(await new Promise(resolve=>{const r=new p.w.FileReader();r.onload=()=>resolve(r.result);r.readAsText(blobs[0]);}));
 assert.deepEqual(file,{schemaVersion:1,type:'openplayx-connector-enrollment',api:'https://api.openplayx.com',name:'Home NAS',enrollmentToken:token,expiresAt:'2026-12-01T00:00:00.000Z'});
 const select=p.field('enroll-result-platform');select.value='darwin-arm64';select.dispatchEvent(new p.w.Event('change',{bubbles:true}));
 assert.match(p.field('enroll-commands').textContent,/serve --enroll openplayx-connector-enrollment\.json --config-dir "\$HOME\/\.openplayx-connector"/);
 assert(p.root.textContent.includes('等待连接的预注册'));click(p,'enroll-done');assert(!p.root.querySelector('#enroll-result'));
 click(p,'enroll-revoke');p.w.document.querySelector('[data-action="confirm-enroll-revoke"]').click();
 await until(()=>p.calls.some(c=>c.url==='/account/api/connectors/enrollments/enrollment_a'&&c.method==='DELETE')&&!p.root.textContent.includes('等待连接的预注册'));
 p.dom.window.close();
});
test('account center follows the browser language and switches between English and Chinese in place',async()=>{
 const p=page('',false,undefined,['en-GB','zh-CN']);await ready(p,'Welcome back');assert.equal(p.w.document.documentElement.lang,'en');assert.equal(p.w.document.title,'Sign in · OpenPlayX');
 assert(p.root.textContent.includes('Forgot password?'));assert(!/[\u4e00-\u9fff]/.test(p.field('account-content').textContent));
 const toggle=p.root.querySelector('[data-lang-toggle]');assert.equal(toggle.textContent,'中文');toggle.click();await ready(p,'欢迎回来');
 assert.equal(p.w.document.documentElement.lang,'zh-CN');assert.equal(p.w.localStorage.getItem('opx-lang'),'zh-CN');assert.equal(toggle.textContent,'English');assert.equal(p.w.document.title,'登录 · OpenPlayX');
 p.field('email').value='owner@example.com';p.field('password').value='owner-password-123';await submit(p);await ready(p,'我的服务');
 p.root.querySelector('[data-lang-toggle]').click();await ready(p,'My services');assert(p.root.textContent.includes('Services: 1 · Connectors: 1'));p.dom.window.close();
});
test('account dictionaries have the same keys in English and Chinese',async()=>{
 const {default:en}=await import('../i18n/en/account.json',{with:{type:'json'}}),{default:zh}=await import('../i18n/zh-CN/account.json',{with:{type:'json'}});
 const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?flat(v,p+k+'.'):[p+k]);
 assert.deepEqual(flat(en).sort(),flat(zh).sort());
 const vars=v=>(v.match(/\{\w+\}/g)||[]).sort().join();const get=(o,k)=>k.split('.').reduce((a,p)=>a[p],o);
 for(const key of flat(en))assert.equal(vars(get(en,key)),vars(get(zh,key)),key);
});

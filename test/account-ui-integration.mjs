import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import {accountAppHTML} from '../src/pages/account-app.mjs';
import script from '../src/pages/account-app-client.mjs';
import {accountI18nJS} from '../src/pages/index.mjs';
import {i18nJS} from '../ui/ui-kit.mjs';
const until=async predicate=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Account UI timed out');};
export async function accountUIIntegration(dispatch){
 const dom=new JSDOM(accountAppHTML,{url:'https://openplayx.com/account/',runScripts:'outside-only'}),w=dom.window;let cookie='';const calls=[];
 w.setInterval=()=>0;w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 w.fetch=async(path,init={})=>{const h=new Headers(init.headers);if(init.method!=='GET'&&init.method)h.set('Origin','https://openplayx.com');if(cookie&&init.credentials==='same-origin')h.set('Cookie',cookie);calls.push({path,method:init.method});const response=await dispatch(new URL(path,'https://openplayx.com'),{...init,headers:h});const set=response.headers.get('Set-Cookie');if(set)cookie=set.split(';')[0];return response;};
 try{Object.defineProperty(w.navigator,'languages',{value:['zh-CN'],configurable:true});w.eval(i18nJS);w.eval(accountI18nJS);w.eval(script);await until(()=>w.document.querySelector('h1')?.textContent==='欢迎回来');w.document.getElementById('email').value='fixture@example.com';w.document.getElementById('password').value='fixture-password-123';w.document.getElementById('auth-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>w.document.getElementById('account-content')?.textContent.includes('Fixture SMB'));assert.equal(w.location.pathname,'/account/');assert.ok(!w.document.body.textContent.includes('private-access'));assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);assert.equal(w.document.querySelector('[data-action="add-service"]'),null);assert.equal(w.document.querySelector('[data-action="devices"]'),null);
 w.document.querySelector('[data-action="service-detail"]').click();assert.ok(w.document.getElementById('account-dialog').textContent.includes('云端不提供服务编辑'));w.document.querySelector('[data-action="close"]').click();
 w.document.querySelector('[data-action="logout"]').click();await until(()=>w.document.querySelector('h1')?.textContent==='欢迎回来');assert.ok(calls.every(c=>!c.path.includes('/grants')));assert.ok(!calls.some(c=>/\/services\//.test(c.path)&&c.method!=='GET'));
 }finally{w.close();}
}

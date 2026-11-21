import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {pageResponse as accountPages} from '../src/pages/index.mjs';
import {accountHTML,accountJS} from '../src/pages/account-ui.mjs';
function page(path,reply={}){
 const dom=new JSDOM(accountHTML,{url:'https://api.example.com/account/'+path,runScripts:'outside-only'}),calls=[];
 dom.window.fetch=async(url,init)=>{calls.push({url,...init,body:JSON.parse(init.body)});return {ok:true,json:async()=>reply};};
 dom.window.eval(accountJS);return {dom,w:dom.window,calls,field:id=>dom.window.document.getElementById(id)};
}
async function submit(p){p.field('account-form').dispatchEvent(new p.w.Event('submit',{cancelable:true}));await new Promise(resolve=>setImmediate(resolve));}
test('account pages and assets use no-store, strict CSP and exact read-only routes',async()=>{
 for(const path of ['register','setup','verify','recover','reset','assets/app.js','assets/app.css']){
  const response=accountPages(new Request('https://api.test/account/'+path));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 }
 assert.equal(accountPages(new Request('https://api.test/other')),null);
 assert.equal(accountPages(new Request('https://api.test/account/missing')).status,404);
 assert.equal(accountPages(new Request('https://api.test/account/register',{method:'POST'})).status,405);
});
test('registration UI sends email only and recovery uses its own endpoint',async()=>{
 for(const [path,endpoint] of [['register','registration/request'],['recover','password-reset/request']]){
  const p=page(path);p.field('email').value='owner@example.com';await submit(p);
  assert.equal(p.calls[0].url,'/v1/auth/'+endpoint);assert.deepEqual(p.calls[0].body,{email:'owner@example.com'});assert.equal(p.calls[0].credentials,'omit');p.dom.window.close();
 }
});
test('setup/reset remove token from address, require matching passwords, and clear fields after success',async()=>{
 for(const [path,endpoint] of [['setup','registration/complete'],['reset','password-reset/confirm']]){
  const token='a'.repeat(43),p=page(path+'#token='+token,{email:'owner@example.com'});
  assert.equal(p.w.location.hash,'');assert.equal(p.calls.length,0);
  p.field('password').value='owner-password-123';p.field('confirm').value='different-password';await submit(p);assert.equal(p.calls.length,0);
  p.field('confirm').value='owner-password-123';await submit(p);
  assert.equal(p.calls[0].url,'/v1/auth/'+endpoint);assert.equal(p.calls[0].body.token,token);assert.equal(p.field('password').value,'');assert.equal(p.field('account-form').hidden,true);p.dom.window.close();
 }
 const invalid=page('setup#token=wrong');assert.equal(invalid.field('submit').disabled,true);invalid.dom.window.close();
});
test('verify waits for user action and server errors remain safe',async()=>{
 const p=page('verify#token='+'a'.repeat(43));assert.equal(p.calls.length,0);await submit(p);assert.equal(p.calls[0].url,'/v1/auth/verify-email');p.dom.window.close();
 const error=page('register');error.w.fetch=async()=>({ok:false,json:async()=>({error:{code:'mail_send_limit',message:'private upstream'}})});error.field('email').value='owner@example.com';await submit(error);assert.match(error.field('status').textContent,/额度/);assert.ok(!error.field('status').textContent.includes('private'));assert.equal(error.field('submit').disabled,false);error.dom.window.close();
});

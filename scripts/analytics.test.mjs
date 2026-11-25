import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise our analytics adapter without a browser or any network requests.
function fixture(choice = null, pathname = '/') {
  // `choice` simulates a value saved by the removed consent banner; it must no longer matter.
  const nodes = [];
  const handlers = {};
  const captures = [];
  let options, initCount = 0, optedOut = false;
  const store = () => {
    const values = new Map();
    return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  };
  const localStorage = store();
  if (choice !== null) localStorage.setItem('opx-analytics-choice-v2', JSON.stringify(choice));
  const document = {
    documentElement:{lang:'en'}, referrer:'https://referral.example/path?secret=private',
    createElement(tag) {
      const node = {tag, handlers:{},setAttribute(){},append(){},focus(){},addEventListener(k,v){this.handlers[k]=v;}};
      nodes.push(node); return node;
    },
    body:{append(){}},querySelector:()=>({append(){}}),
    addEventListener:(key,handler)=>{handlers[key]=handler;},
  };
  const posthog = {
    init(_token, config){options=config;initCount++;},
    capture(event, properties){
      const payload=options.before_send({event,properties:{token:'public-token',distinct_id:'anonymous',...properties,$current_url:'https://openplayx.com/?secret=private',$referrer:'https://private.example/path'}});
      if(payload)captures.push(payload);
    },
    startSessionRecording(){},stopSessionRecording(){},opt_in_capturing(){},opt_out_capturing(){optedOut=true;},reset(){},
  };
  const location={pathname,hostname:'openplayx.com',search:'?secret=private',href:'https://openplayx.com'+pathname+'?secret=private'};
  const window={addEventListener:(key,handler)=>{handlers[key]=handler;}};
  const source=readFileSync(new URL('../src/analytics.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInNewContext(source,{document,posthog,localStorage,sessionStorage:store(),
    URL,URLSearchParams,Date,config:{projectToken:'public-token',host:'https://us.i.posthog.com',environment:'production'},
    campaigns:{sources:['github'],mediums:['referral'],campaigns:[],contents:[]},release:{assets:[]},
    location,window});
  return {created:nodes,captures,handlers,location,get initCount(){return initCount;},get optedOut(){return optedOut;},get options(){return options;}};
}

test('starts on every visit without a prompt, ignoring an old saved rejection',()=>{
  for (const choice of [null,false,true]) {
    const f=fixture(choice);
    assert.equal(f.initCount,1);
    assert.equal(f.captures.length,1);
    assert.equal(f.captures[0].event,'$pageview');
    assert.equal(f.created.length,0);
  }
});
test('payload keeps ingestion token and removes private URL/referrer',()=>{
  const f=fixture();
  assert.ok(f.options.autocapture);
  assert.equal(f.options.disable_session_recording,false);
  const payload=f.captures[0];
  assert.equal(payload.properties.token,'public-token');
  assert.equal(payload.properties.$geoip_disable,false);
  assert.equal(payload.properties.$current_url,'https://openplayx.com/');
  assert.equal(payload.properties.$referrer,'https://referral.example');
  assert.equal(payload.properties.$referring_domain,'referral.example');
  assert.ok(!JSON.stringify(payload).includes('private'));
});
test('business click events are captured',()=>{
  const f=fixture();
  f.handlers.click({target:{closest:()=>({href:'https://github.com/openplayx/openplayx',closest:()=>null,matches:()=>false})}});
  assert.equal(f.captures.at(-1).event,'repository_clicked');
  f.handlers.click({target:{closest:()=>({href:'https://github.com/openplayx/openplayx/releases/download/v0.0.5/openplayx-0.0.5-macos-universal-abcdef1234.dmg',closest:()=>null,matches:()=>false})}});
  assert.equal(f.captures.at(-1).event,'download_clicked');
  assert.equal(f.captures.at(-1).properties.target_platform,'macos');
  assert.equal(f.captures.at(-1).properties.architecture,'Universal');
  f.handlers.click({target:{closest:()=>({href:'https://github.com/openplayx/openplayx/releases/download/v0.0.5/openplayx-0.0.5-windows-x64-abcdef1234.exe',closest:()=>null,matches:()=>false})}});
  assert.equal(f.captures.at(-1).event,'download_clicked');
  assert.equal(f.captures.at(-1).properties.target_platform,'windows');
  assert.equal(f.captures.at(-1).properties.architecture,'x86_64');
});

test('automatic metrics retain context and payloads while stripping URL secrets',()=>{
  const f=fixture(true);
  for (const event of ['$pageleave','$autocapture','$$heatmap','$snapshot','$web_vitals','$exception']) {
    const payload=f.options.before_send({event,properties:{
      $browser:'Safari',$os:'iOS',$device_type:'Mobile',$viewport_width:390,
      $web_vitals_LCP_value:1234,$prev_pageview_duration:12,
      $heatmap_data:{'https://openplayx.com/?secret=private':[{x:10,y:20}]},
      $snapshot_data:[{type:4,data:{href:'https://openplayx.com/?secret=private#private'}}],
      $exception_list:[{type:'Error',value:'Failed at https://openplayx.com/?secret=private'}],
      password:'private',
    }});
    assert.equal(payload.properties.origin,'web');
    assert.equal(payload.properties.environment,'production');
    assert.equal(payload.properties.$browser,'Safari');
    assert.equal(payload.properties.$web_vitals_LCP_value,1234);
    assert.equal(payload.properties.$prev_pageview_duration,12);
    assert.ok(payload.properties.$snapshot_data);
    assert.ok(payload.properties.$heatmap_data['https://openplayx.com/']);
    assert.ok(!JSON.stringify(payload).includes('private'));
  }
});
test('replay keeps masked inputs and blocks file inputs and network bodies',()=>{
  const f=fixture(true), config=f.options.session_recording;
  assert.equal(config.maskAllInputs,true);
  assert.equal(config.recordBody,false);
  assert.equal(config.recordHeaders,false);
  assert.ok(config.blockSelector.includes('input[type=file]'));
  assert.equal(config.maskAttributeFn('href','https://openplayx.com/?token=private'),'https://openplayx.com/');
  assert.equal(f.options.before_send({event:'unexpected',properties:{}}),null);
});

test('docs SPA sends one pageview per article and excludes search queries and replay',()=>{
  const f=fixture(null,'/docs/');
  assert.equal(f.captures.length,1);
  assert.equal(f.options.autocapture,false);
  assert.equal(f.options.disable_session_recording,true);
  f.handlers['opx:docs-navigation']();
  assert.equal(f.captures.length,1,'initial hydration is not another view');
  f.location.pathname='/docs/sources/smb/';
  f.location.search='?q=private&token=private';
  f.handlers['opx:docs-navigation']();
  f.handlers['opx:docs-navigation']();
  assert.equal(f.captures.length,2);
  assert.equal(f.captures[1].properties.$current_url,'https://openplayx.com/docs/sources/smb/');
  assert(!JSON.stringify(f.captures).includes('private'));
  assert.equal(f.options.before_send({event:'$snapshot',properties:{}}),null);
  f.location.pathname='/docs/search';
  f.handlers['opx:docs-navigation']();
  assert.equal(f.captures.at(-1).properties.$pathname,'/docs/404/');
});

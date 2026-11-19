import posthog from 'posthog-js';
import config from '../content/analytics.json';
import campaigns from '../content/campaigns.json';
import release from '../content/releases.json';

const choiceKey = 'opx-analytics-choice-v1';
const firstKey = 'opx-analytics-first-v1';
const sessionKey = 'opx-analytics-session-v1';
const zh = document.documentElement.lang.startsWith('zh');
const read = (store, key) => { try { return JSON.parse(store.getItem(key)); } catch { return null; } };
const write = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch {} };
const remove = (store, key) => { try { store.removeItem(key); } catch {} };
let allowed = read(localStorage, choiceKey) === true;
let ready = false;
let pageSent = false;
let firstTouch, sessionTouch;
const path = location.pathname;
const page = path.replace(/^\/zh(?=\/)/, '').split('/').filter(Boolean)[0] || 'home';
const route = `/${zh ? 'zh/' : ''}${page === 'home' ? '' : page + '/'}`;
const query = new URLSearchParams(location.search);
const environment = ['localhost','127.0.0.1'].includes(location.hostname) || query.get('analytics_test') === '1' ? 'validation' : config.environment;
const entry = {};
for (const [name, list] of Object.entries({utm_source: campaigns.sources, utm_medium: campaigns.mediums, utm_campaign: campaigns.campaigns, utm_content: campaigns.contents})) {
  const value = query.get(name)?.toLowerCase();
  if (list.includes(value)) entry[name] = value;
}
if (!entry.utm_source) {
  try {
    const host = new URL(document.referrer).hostname;
    entry.utm_source = host === location.hostname ? 'direct_or_unknown' : host === 'github.com' ? 'github' : 'other';
    if (host !== location.hostname) entry.utm_medium = 'referral';
  } catch { entry.utm_source = 'direct_or_unknown'; }
}
const safeKeys = new Set(['origin','environment','schema_version','locale','page_type','site_version',
  'utm_source','utm_medium','utm_campaign','utm_content','first_utm_source','first_utm_medium',
  'first_utm_campaign','first_utm_content','target_platform','architecture','release_tag','asset_name',
  'repository','button_position','from_locale','to_locale','action',
  'token','distinct_id','$distinct_id','$device_id','$session_id','$window_id','$lib','$lib_version',
  '$process_person_profile','$geoip_disable']);
const events = new Set(['$pageview','download_page_viewed','download_clicked','repository_clicked','contribute_clicked','language_changed']);
function capture(event, properties = {}) {
  if (!allowed || !ready) return;
  try {
    posthog.capture(event, {origin:'web',environment,schema_version:1,
      locale:zh?'zh':'en',page_type:page,site_version:'2026-11-19',
      ...sessionTouch,...Object.fromEntries(Object.entries(firstTouch || {}).map(([k,v])=>['first_'+k,v])),
      ...properties});
  } catch { /* Download/navigation never waits for analytics. */ }
}
function begin() {
  if (!allowed) return;
  const now = Date.now();
  let first = read(localStorage, firstKey);
  let session = read(sessionStorage, sessionKey);
  const external = (()=>{try{return new URL(document.referrer).hostname !== location.hostname;}catch{return false;}})();
  if (!first || now - first.at > 30*86400000) first = {at:now,touch:entry};
  if (!session || now - session.at > 30*60000 || external) session = {at:now,touch:entry};
  else session.at = now;
  write(localStorage,firstKey,first); write(sessionStorage,sessionKey,session);
  firstTouch=first.touch;sessionTouch=session.touch;
  if (!ready) {
    posthog.init(config.projectToken, {
      api_host:config.host,debug:environment==='validation',autocapture:false,capture_pageview:false,capture_pageleave:false,
      disable_session_recording:true,disable_surveys:true,capture_performance:false,
      capture_heatmaps:false,capture_exceptions:false,person_profiles:'never',
      advanced_disable_flags:true,advanced_disable_feature_flags:true,
      advanced_disable_feature_flags_on_first_load:true,disable_external_dependency_loading:true,
      persistence:'localStorage',bootstrap:{},
      before_send(event) {
        if (!allowed || !events.has(event.event)) return null;
        event.properties=Object.fromEntries(Object.entries(event.properties || {}).filter(([k])=>safeKeys.has(k)));
        event.properties.$current_url = 'https://openplayx.com'+route;
        event.properties.$pathname = route;
        event.properties.$geoip_disable = true;
        return event;
      },
    });
    ready=true;
  }
  posthog.opt_in_capturing({captureEventName:false});
  if (!pageSent) {
    pageSent=true;
    capture('$pageview');
    if (page==='download') capture('download_page_viewed');
  }
}
const banner = document.createElement('section');
banner.className='analytics-choice';
banner.setAttribute('aria-label',zh?'使用统计选择':'Usage analytics choice');
const text = document.createElement('p');
text.textContent=zh?'允许匿名使用统计吗？帮助改进官网与下载体验，数据发送至 PostHog 美国区，可随时更改。':'Allow anonymous usage analytics? Help improve this website and downloads. Data goes to PostHog US. You can change this anytime.';
const controls=document.createElement('div');
const accept=document.createElement('button');accept.type='button';accept.textContent=zh?'允许统计':'Allow analytics';
const reject=document.createElement('button');reject.type='button';reject.textContent=zh?'不允许':'No thanks';
function choose(value) {
  allowed=value;write(localStorage,choiceKey,value);banner.hidden=true;
  if(value)begin();
  else {
    if(ready){posthog.opt_out_capturing();posthog.reset();}
    remove(localStorage,firstKey);remove(sessionStorage,sessionKey);
  }
}
accept.addEventListener('click',()=>choose(true));reject.addEventListener('click',()=>choose(false));
controls.append(accept,reject);banner.append(text,controls);document.body.append(banner);
banner.hidden=read(localStorage,choiceKey)!==null;
const settings=document.createElement('button');settings.type='button';settings.className='analytics-settings';
settings.textContent=zh?'统计偏好':'Analytics preferences';
settings.addEventListener('click',()=>{banner.hidden=false;accept.focus();});
document.querySelector('.footer-bottom')?.append(settings);
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link)return;
  const url=new URL(link.href,location.href);
  const asset=release.assets.find(asset=>asset.url===url.href);
  const position=link.closest('.site-header')?'header':link.closest('.site-footer')?'footer':'content';
  if(asset)capture('download_clicked',{target_platform:asset.platform,architecture:asset.architecture,
    release_tag:release.tag,asset_name:asset.name,repository:'openplayx/openplayx',button_position:position});
  else if(link.matches('[data-language]'))capture('language_changed',{from_locale:zh?'zh':'en',to_locale:zh?'en':'zh'});
  else if(url.hostname==='github.com'&&url.pathname==='/openplayx/openplayx')capture('repository_clicked',{repository:'openplayx/openplayx',button_position:position});
  else if(url.pathname.includes('/contribute/')||url.hostname==='github.com'&&url.pathname.includes('/issues'))capture('contribute_clicked',{action:'contribute',button_position:position});
});
if(allowed)begin();

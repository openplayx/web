import posthog from 'posthog-js/full/no-external';
import config from '../content/analytics.json';
import campaigns from '../content/campaigns.json';
// Download links point at GitHub release assets; the tag and platform come from the URL,
// so clicks are attributed correctly whichever release the Worker rendered.
const androidArch={arm64:'ARM64',armv7:'ARMv7',x64:'x86_64'};
function releaseAsset(url){
  const m=url.hostname==='github.com'&&url.pathname.match(/^\/openplayx\/openplayx\/releases\/download\/([^/]+)\/([^/]+)$/);if(!m)return null;
  const [,tag,name]=m,android=name.match(/-android(?:-(arm64|armv7|x64))?-[0-9a-f]{7,40}\.apk$/);
  const mac=name.match(/-macos-(arm64|x86_64|universal)-[0-9a-f]{7,40}\.(dmg|zip)$/);
  if(mac)return {tag,name,platform:'macos',architecture:{arm64:'Apple Silicon',x86_64:'Intel',universal:'Universal'}[mac[1]]};
  if(/-windows-x64-[0-9a-f]{7,40}\.(exe|zip)$/.test(name))return {tag,name,platform:'windows',architecture:'x86_64'};
  return android?{tag,name,platform:'android',architecture:androidArch[android[1]]||'Universal'}:null;
}

const firstKey = 'opx-analytics-first-v1';
const sessionKey = 'opx-analytics-session-v1';
const zh = document.documentElement.lang.startsWith('zh');
const read = (store, key) => { try { return JSON.parse(store.getItem(key)); } catch { return null; } };
const write = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch {} };
// Analytics runs on every visit; there is no consent prompt. Drop the choice saved by the old banner.
try { localStorage.removeItem('opx-analytics-choice-v2'); } catch {}
let ready = false;
let pageSent = false;
let firstTouch, sessionTouch;
const docsVisit = location.pathname.startsWith('/docs/');
const path = location.pathname;
const page = docsVisit ? 'docs' : path.replace(/^\/zh(?=\/)/, '').split('/').filter(Boolean)[0] || 'home';
let route = `/${zh ? 'zh/' : ''}${page === 'home' ? '' : page + '/'}`;
function docsRoute(pathname) {
  const match=pathname.match(/^\/docs\/(zh-Hans\/)?(.*)$/);
  const allowed=[
    '','getting-started/first-video/','getting-started/tv/',
    'playback/engines-and-pip/','playback/subtitles/',
    'sources/smb/','sources/media-servers/','sources/cloud-drives/',
    'library/home/','ai/models/','ai/mcp/','remote-access/connector/','help/faq/',
  ];
  return match ? '/docs/'+(match[1]||'')+(allowed.includes(match[2])?match[2]:'404/') : '/docs/';
}
if (docsVisit) route=docsRoute(path);
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
  '$process_person_profile','$geoip_disable',
  '$browser','$browser_version','$os','$os_version','$device_type','$device',
  '$screen_height','$screen_width','$viewport_height','$viewport_width',
  '$browser_language','$browser_language_prefix','$timezone','$timezone_offset',
  '$host','$title','$referring_domain','$initial_referring_domain',
  '$prev_pageview_duration','$prev_pageview_pathname','$prev_pageview_id','$pageview_id',
  '$event_type','$elements','$elements_chain','$el_text','$ce_version',
  '$heatmap_data','$snapshot_data','$snapshot_bytes','$snapshot_host',
  '$exception_list','$exception_type','$exception_message','$exception_level',
  '$exception_source','$exception_fingerprint','$exception_personURL',
  '$exception_is_synthetic','$exception_handled']);
const events = new Set(['$pageleave','$autocapture','$$heatmap','$snapshot','$web_vitals','$exception','$rageclick','$dead_click','$pageview','download_page_viewed','download_clicked','repository_clicked','contribute_clicked','language_changed']);
// Strip query strings/fragments from URLs, including replay metadata and heatmap keys.
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[cleanUrl(k),scrub(v)]));
  return typeof value === 'string' ? value.replace(/https?:\/\/[^\s\"<>]+/g, cleanUrl) : value;
}
function cleanUrl(value) {
  try { const url=new URL(value); if (!['http:','https:'].includes(url.protocol)) return value; return url.origin+url.pathname; } catch { return value; }
}
function capture(event, properties = {}) {
  if (!ready) return;
  try {
    posthog.capture(event, {origin:'web',environment,schema_version:1,
      locale:zh?'zh':'en',page_type:page,site_version:'2026-11-21',
      ...sessionTouch,...Object.fromEntries(Object.entries(firstTouch || {}).map(([k,v])=>['first_'+k,v])),
      ...properties});
  } catch { /* Download/navigation never waits for analytics. */ }
}
function begin() {
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
      api_host:config.host,debug:environment==='validation',autocapture:docsVisit?false:{capture_copied_text:false},capture_pageview:false,capture_pageleave:!docsVisit,
      disable_session_recording:docsVisit,disable_surveys:true,capture_performance:docsVisit?false:{web_vitals:true,network_timing:true},
      capture_heatmaps:!docsVisit,capture_exceptions:!docsVisit,person_profiles:'always',
      session_recording:{sampleRate:1,maskAllInputs:true,blockSelector:'input[type=file], .ph-no-capture',
        recordHeaders:false,recordBody:false,recordCrossOriginIframes:false,
        maskAttributeFn:(name,value)=>['href','src','action'].includes(name)?cleanUrl(value):value,
        maskCapturedNetworkRequestFn:data=>({...data,url:cleanUrl(data.url)})},
      enable_recording_console_log:false,
      advanced_disable_flags:false,advanced_disable_feature_flags:true,
      advanced_disable_feature_flags_on_first_load:true,disable_external_dependency_loading:true,
      persistence:'localStorage',bootstrap:{},
      before_send(event) {
        if (!events.has(event.event) || docsVisit && event.event!=='$pageview') return null;
        event.properties=Object.fromEntries(Object.entries(event.properties || {}).filter(([k])=>safeKeys.has(k)||/^\$web_vitals_(LCP|CLS|INP|FCP|TTFB)_(value|event)$/.test(k)));
        event.properties=scrub(event.properties);
        if(event.event==='$exception') event.properties.$exception_type=event.properties.$exception_list?.[0]?.type || 'Error';
        Object.assign(event.properties,{origin:'web',environment,schema_version:1,locale:zh?'zh':'en',page_type:page,site_version:'2026-11-21'});
        const referrer=(()=>{try{return new URL(document.referrer);}catch{return null;}})();
        if(referrer){event.properties.$referrer=referrer.origin;event.properties.$referring_domain=referrer.hostname;}
        event.properties.$current_url = 'https://openplayx.com'+route;
        event.properties.$pathname = route;
        if(docsVisit){event.properties.$title='OpenPlayX Docs';delete event.properties.$prev_pageview_pathname;}
        event.properties.$geoip_disable = false;
        return event;
      },
    });
    ready=true;
  }
  posthog.opt_in_capturing({captureEventName:false});
  if (!docsVisit) posthog.startSessionRecording();
  if (!pageSent) {
    pageSent=true;
    capture('$pageview');
    if (page==='download') capture('download_page_viewed');
  }
}
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link)return;
  const url=new URL(link.href,location.href);
  const asset=releaseAsset(url);
  const position=link.closest('.site-header')?'header':link.closest('.site-footer')?'footer':'content';
  if(asset)capture('download_clicked',{target_platform:asset.platform,architecture:asset.architecture,
    release_tag:asset.tag,asset_name:asset.name,repository:'openplayx/openplayx',button_position:position});
  else if(link.matches('[data-language]'))capture('language_changed',{from_locale:zh?'zh':'en',to_locale:zh?'en':'zh'});
  else if(url.hostname==='github.com'&&url.pathname==='/openplayx/openplayx')capture('repository_clicked',{repository:'openplayx/openplayx',button_position:position});
  else if(url.pathname.includes('/contribute/')||url.hostname==='github.com'&&url.pathname.includes('/issues'))capture('contribute_clicked',{action:'contribute',button_position:position});
});
if (docsVisit) window.addEventListener('opx:docs-navigation',()=>{
  const next=docsRoute(location.pathname);
  if(next!==route){route=next;capture('$pageview');}
});
begin();

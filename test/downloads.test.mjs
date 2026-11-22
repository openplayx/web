import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {render} from '../src/render.mjs';
import {appAsset} from '../src/app-assets.mjs';
import {loadRelease, snapshots, validRelease} from '../src/releases.mjs';
const snapshot = snapshots.app;
test('every published installer has one download link and homepage platform anchors resolve in both languages', () => {
  for (const lang of ['en','zh']) {
    const home = new JSDOM(render(lang)).window.document;
    const download = new JSDOM(render(lang,'download')).window.document;
    assert.equal(download.querySelectorAll('.download-card').length,new Set(snapshot.assets.map(a=>a.platform)).size);
    assert.equal(home.querySelectorAll('.home-downloads a').length,new Set(snapshot.assets.map(a=>a.platform)).size);
    for (const a of home.querySelectorAll('.home-downloads a')) assert.ok(download.querySelector(new URL(a.href,'https://openplayx.com').hash));
    for (const asset of snapshot.assets) assert.equal([...download.querySelectorAll('.download-card a')].filter(a=>a.href===asset.url).length,1,asset.name);
    assert.match(download.querySelector('#download-macos .button').href,/-macos-universal-/);
    assert.match(download.querySelector('#download-android .button').href,/-android-arm64-/);
    assert.match(download.querySelector('#download-android-tv .button').href,/-android-tv-/);
    assert.ok(!download.querySelector('#download-android').textContent.includes('TV'));
    assert.ok(!home.body.textContent.includes('{platforms}'));
  }
});
test('legacy same-tag KV manifests gain omitted packages; other versions keep their own assets',async()=>{
  const legacy={...snapshot,assets:snapshot.assets.filter(a=>a.platform==='android'||a.platform==='macos'&&a.architecture==='Apple Silicon')};
  const env=m=>({RELEASES:{get:async()=>m}});
  assert.ok(validRelease('app',legacy));
  assert.deepEqual((await loadRelease(env(legacy),'app')).assets,snapshot.assets);
  const older=JSON.parse(JSON.stringify(legacy).replaceAll(snapshot.tag,'v0.0.2'));
  assert.deepEqual(await loadRelease(env(older),'app'),older);
  const doc=new JSDOM(render('en','download',false,older)).window.document;
  assert.equal(doc.querySelectorAll('.download-card').length,2);
  assert.equal(doc.querySelector('#download-windows'),null);
});
test('package classification rejects unknown targets and wrong formats',()=>{
  for(const name of ['openplayx-0.0.4-ios-arm64-abcdef1234.zip','openplayx-0.0.4-windows-x64-abcdef1234.apk','openplayx-0.0.4-android-tv-abcdef1234.zip','arbitrary.zip']) assert.equal(appAsset(name),null);
  const invalid=structuredClone(snapshot);invalid.assets[0].platform='android';assert.equal(validRelease('app',invalid),false);
});

test('Apple TV IPA is distinct from Android TV and rejects the wrong format',()=>{
  assert.deepEqual(appAsset('openplayx-0.0.4-tvos-arm64-abcdef1234.ipa'),{platform:'tvos',architecture:'ARM64'});
  assert.equal(appAsset('openplayx-0.0.4-tvos-arm64-abcdef1234.apk'),null);
  const asset={platform:'tvos',architecture:'ARM64',name:'openplayx-0.0.4-tvos-arm64-abcdef1234.ipa',url:'https://github.com/openplayx/openplayx/releases/download/v0.0.4/openplayx-0.0.4-tvos-arm64-abcdef1234.ipa',bytes:1000000};
  const release={...snapshot,assets:[...snapshot.assets.filter(a=>a.platform!=='tvos'),asset]};
  assert.ok(validRelease('app',release));
  for(const lang of ['en','zh']) {
    const doc=new JSDOM(render(lang,'download',false,release)).window.document;
    assert.equal(doc.querySelector('#download-tvos .button').href,asset.url);
    assert.match(doc.querySelector('#download-tvos').textContent,lang==='en'?/Re-sign the sideload IPA/:/侧载包需重签名/);
    assert.ok(new JSDOM(render(lang,'',false,release)).window.document.querySelector('a[href$="#download-tvos"]'));
  }
});

test('Apple TV App Store export is secondary to the re-signable IPA',()=>{
  const name='openplayx-0.0.4-tvos-appstore-arm64-abcdef1234.ipa';
  const info=appAsset(name);
  assert.deepEqual(info,{platform:'tvos',architecture:'ARM64 · App Store'});
  const signed={...info,name,url:`https://github.com/openplayx/openplayx/releases/download/v0.0.4/${name}`,bytes:1000000};
  const release={...snapshot,assets:[signed,...snapshot.assets]};
  for(const lang of ['en','zh']) {
    const doc=new JSDOM(render(lang,'download',false,release)).window.document;
    assert.ok(!doc.querySelector('#download-tvos .button').href.includes('-appstore-'));
    assert.equal([...doc.querySelectorAll('#download-tvos a')].filter(a=>a.href===signed.url).length,1);
  }
});

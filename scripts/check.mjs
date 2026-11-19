import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from '../src/render.mjs';
import { copy } from '../content/copy.mjs';
import release from '../content/releases.json' with { type: 'json' };
const root=fileURLToPath(new URL('../dist/',import.meta.url));
assert.deepEqual(Object.keys(copy.en).sort(),Object.keys(copy.zh).sort(),'Both languages must have the same content keys');
assert.equal(release.assets.filter(a=>a.platform==='macos').length,1);
assert.equal(release.assets.filter(a=>a.platform==='android').length,4);
for(const asset of release.assets){
  assert(asset.url.startsWith(`https://github.com/openplayx/openplayx/releases/download/${release.tag}/`));
  assert(asset.bytes>0);assert(!asset.url.includes('<'));
}
let links=0;
for(const lang of ['en','zh'])for(const page of pages){
  const prefix=lang==='zh'?'/zh':'';
  const route=`${prefix}/${page?page+'/':''}`;
  const path=resolve(root,'.'+route,'index.html');
  const html=await readFile(path,'utf8');
  assert(html.includes(`<html lang="${lang==='zh'?'zh-CN':'en'}">`));
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${route}: one h1`);
  assert(!/undefined|\[object Object\]|TODO|lorem ipsum/i.test(html),route);
  assert(html.includes('hreflang="x-default"'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`${route}: duplicate IDs`);
  for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const link=match[1];
    if(/^https?:|^mailto:|^data:/.test(link))continue;
    const u=new URL(link,'https://openplayx.com'+route);
    if(u.pathname===route && u.hash)assert(ids.includes(decodeURIComponent(u.hash.slice(1))),`${route}: missing anchor ${link}`);
    let target=resolve(root,'.'+u.pathname);
    if(u.pathname.endsWith('/'))target=resolve(target,'index.html');
    await access(target);links++;
  }
}
const css=await readFile(resolve(root,'assets/site.css'),'utf8');
assert(css.includes('prefers-reduced-motion'));
assert((await readFile(resolve(root,'index.html'),'utf8')).includes('/assets/analytics.js'));
assert((await readFile(resolve(root,'404.html'),'utf8')).includes('noindex'));
console.log(`Checked 10 localized pages, ${links} local references, release assets, language parity and metadata.`);

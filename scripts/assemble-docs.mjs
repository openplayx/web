import assert from 'node:assert/strict';
import {readFile, readdir, cp, rm, writeFile, lstat} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
const source=resolve(process.argv[2] || process.env.OPX_DOCS_BUILD || join(root,'../docs/build'));
const dist=join(root,'dist'), target=join(dist,'docs');
assert(source!==target && !source.startsWith(dist+'/'),'Docs source must be separate from website output');
const manifest=JSON.parse(await readFile(join(source,'docs-manifest.json'),'utf8'));
assert.equal(manifest.schemaVersion,1);
async function files(dir) { return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>{
  const path=join(dir,e.name); assert(!(await lstat(path)).isSymbolicLink(),'Symlinks are forbidden');
  return e.isDirectory()?files(path):[path.slice(source.length+1)];
}))).flat().sort(); }
assert.deepEqual((await files(source)).filter(p=>p!=='docs-manifest.json'),Object.keys(manifest.files).sort(),'Manifest must cover the entire docs output');
for(const [name,record] of Object.entries(manifest.files)){
  const path=resolve(source,name);assert(path.startsWith(source+'/'),'Invalid artifact path');
  const bytes=await readFile(path);
  assert.equal(bytes.length,record.size,name);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,`Docs digest mismatch: ${name}`);
}
for(const route of ['index.html','zh-Hans/index.html','sources/smb/index.html','zh-Hans/sources/smb/index.html','404.html','sitemap.xml'])assert(manifest.files[route],`Missing docs route ${route}`);
await rm(target,{recursive:true,force:true});await cp(source,target,{recursive:true});
// The standalone docs artifact remains independent of the private build repo and
// marketing analytics. Add the first-party bundle only to the assembled site.
async function inject(dir){for(const e of await readdir(dir,{withFileTypes:true})){
 const path=join(dir,e.name);if(e.isDirectory())await inject(path);
 else if(e.name.endsWith('.html'))await writeFile(path,(await readFile(path,'utf8')).replace('</head>','<script defer src="/assets/analytics.js"></script></head>'));
}}
await inject(target);
const sha=dir=>{try{return execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{return null}};
const provenance={schemaVersion:1,webCommit:process.env.OPX_SOURCE_SHA||sha(root),docsCommit:manifest.docsCommit,buildCommit:process.env.OPX_BUILD_SHA||sha(join(root,'../build')),nodeVersion:process.version,builtAt:new Date().toISOString(),docsManifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')};
await writeFile(join(dist,'site-manifest.json'),JSON.stringify(provenance,null,2)+'\n');
await writeFile(join(dist,'robots.txt'),(await readFile(join(dist,'robots.txt'),'utf8'))+'Sitemap: https://openplayx.com/docs/sitemap.xml\n');
console.log('Assembled verified bilingual docs into the complete website.');

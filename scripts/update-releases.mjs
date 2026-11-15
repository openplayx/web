import { writeFile } from 'node:fs/promises';
const response=await fetch('https://api.github.com/repos/openplayx/openplayx/releases',{
  headers:{Accept:'application/vnd.github+json','User-Agent':'OpenPlayX-Website',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})}
});
if(!response.ok)throw new Error(`GitHub release lookup failed: ${response.status}`);
const release=(await response.json()).find(r=>!r.draft&&!r.prerelease&&r.assets.some(a=>/macos|android/.test(a.name)));
if(!release)throw new Error('No published release with supported installers. Existing manifest unchanged.');
const assets=release.assets.filter(a=>/\.(zip|apk)$/.test(a.name)).map(a=>({platform:a.name.includes('macos')?'macos':'android',architecture:a.name.includes('macos')?'Apple Silicon':a.name.includes('-arm64-')?'ARM64':a.name.includes('-armv7-')?'ARMv7':a.name.includes('-x64-')?'x86_64':'Universal',name:a.name,url:a.browser_download_url,bytes:a.size}));
if(!assets.some(a=>a.platform==='macos')||!assets.some(a=>a.architecture==='ARM64'))throw new Error('Release layout changed. Review renderer before changing the manifest.');
const sums=release.assets.find(a=>a.name==='SHA256SUMS');
if(!sums)throw new Error('Release has no SHA256SUMS. Existing manifest unchanged.');
await writeFile(new URL('../content/releases.json',import.meta.url),JSON.stringify({tag:release.tag_name,url:release.html_url,checkedAt:new Date().toISOString().slice(0,10),assets,checksums:sums.browser_download_url},null,2)+'\n');
console.log(`Updated public release manifest: ${release.tag_name}. Review, build and deploy to publish.`);

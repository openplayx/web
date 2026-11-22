import {appAsset, sortAppAssets} from '../src/app-assets.mjs';
import { writeFile } from 'node:fs/promises';
const response=await fetch('https://api.github.com/repos/openplayx/openplayx/releases',{
  headers:{Accept:'application/vnd.github+json','User-Agent':'OpenPlayX-Website',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})}
});
if(!response.ok)throw new Error(`GitHub release lookup failed: ${response.status}`);
const release=(await response.json()).find(r=>!r.draft&&!r.prerelease&&r.assets.some(a=>/macos|android/.test(a.name)));
if(!release)throw new Error('No published release with supported installers. Existing manifest unchanged.');
const assets=sortAppAssets(release.assets.flatMap(a=>{const info=appAsset(a.name);return info?[{...info,name:a.name,url:a.browser_download_url,bytes:a.size}]:[]}));
if(!assets.some(a=>a.platform==='macos'&&a.architecture==='Apple Silicon')||!assets.some(a=>a.platform==='android'&&a.architecture==='ARM64'))throw new Error('Release layout changed. Existing manifest unchanged.');
const sums=release.assets.find(a=>a.name==='SHA256SUMS');
if(!sums)throw new Error('Release has no SHA256SUMS. Existing manifest unchanged.');
await writeFile(new URL('../content/releases.json',import.meta.url),JSON.stringify({tag:release.tag_name,url:release.html_url,checkedAt:new Date().toISOString().slice(0,10),assets,checksums:sums.browser_download_url},null,2)+'\n');
console.log(`Updated public release manifest: ${release.tag_name}. Review, build and deploy to publish.`);

// Connector packages offered by the account page's pre-registration flow.
const connectorLabels={'linux-amd64':'Linux x86_64','linux-arm64':'Linux ARM64','linux-armv7':'Linux ARMv7（树莓派 / NAS）','linux-armv6':'Linux ARMv6','linux-mips-softfloat':'Linux MIPS（路由器）','linux-mipsle-softfloat':'Linux MIPSLE（路由器）','darwin-arm64':'macOS Apple Silicon','darwin-amd64':'macOS Intel','freebsd-amd64':'FreeBSD x86_64'};
const connectorResponse=await fetch('https://api.github.com/repos/openplayx/openplayx-connector/releases',{
  headers:{Accept:'application/vnd.github+json','User-Agent':'OpenPlayX-Website',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})}
});
if(!connectorResponse.ok)throw new Error(`GitHub Connector release lookup failed: ${connectorResponse.status}`);
const connector=(await connectorResponse.json()).find(r=>!r.draft&&!r.prerelease&&r.assets.some(a=>/-linux-amd64-.*\.tar\.gz$/.test(a.name)));
if(!connector)throw new Error('No published Connector release. Existing manifest unchanged.');
const connectorAssets=connector.assets.map(a=>{const m=a.name.match(/^openplayx-connector-[0-9][^-]*-((?:linux|darwin|freebsd)-[a-z0-9-]+?)-[0-9a-f]{7,40}\.tar\.gz$/);return m&&connectorLabels[m[1]]?{platform:m[1],label:connectorLabels[m[1]],name:a.name,url:a.browser_download_url,bytes:a.size,...(a.digest?.startsWith('sha256:')?{sha256:a.digest.slice(7)}:{})}:null;}).filter(Boolean).sort((a,b)=>Object.keys(connectorLabels).indexOf(a.platform)-Object.keys(connectorLabels).indexOf(b.platform));
const connectorSums=connector.assets.find(a=>a.name==='SHA256SUMS');
if(!connectorAssets.some(a=>a.platform==='linux-amd64')||!connectorSums)throw new Error('Connector release layout changed. Existing manifest unchanged.');
await writeFile(new URL('../content/connector-release.json',import.meta.url),JSON.stringify({tag:connector.tag_name,url:connector.html_url,checkedAt:new Date().toISOString().slice(0,10),assets:connectorAssets,checksums:connectorSums.browser_download_url},null,2)+'\n');
console.log(`Updated Connector release manifest: ${connector.tag_name}.`);

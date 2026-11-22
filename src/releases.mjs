import {appAsset, sortAppAssets} from './app-assets.mjs';
import appSnapshot from '../content/releases.json' with { type: 'json' };
import connectorSnapshot from '../content/connector-release.json' with { type: 'json' };
// Download manifests. Jenkins writes the published release to KV (binding RELEASES,
// keys below) right after a production release; the bundled snapshots in content/
// are the fallback when KV is missing, unreachable or holds something unexpected.
export const releaseKeys = { app: 'release/openplayx', connector: 'release/connector' };
export const snapshots = { app: appSnapshot, connector: connectorSnapshot };
const tagRe = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
const repos = { app: 'openplayx/openplayx', connector: 'openplayx/openplayx-connector' };
export function validRelease(kind, m) {
  if (!m || typeof m !== 'object' || !tagRe.test(m.tag) || !Array.isArray(m.assets)) return false;
  const prefix = `https://github.com/${repos[kind]}/releases/download/${m.tag}/`;
  if (m.url !== `https://github.com/${repos[kind]}/releases/tag/${m.tag}` || m.checksums !== prefix + 'SHA256SUMS') return false;
  if (!m.assets.every(a => a && typeof a.name === 'string' && a.url === prefix + a.name && Number.isSafeInteger(a.bytes) && a.bytes > 0)) return false;
  return kind === 'app'
    ? m.assets.every(a => { const info = appAsset(a.name); return info && info.platform === a.platform && info.architecture === a.architecture; }) && m.assets.some(a => a.platform === 'macos' && a.architecture === 'Apple Silicon') && m.assets.some(a => a.platform === 'android' && a.architecture === 'ARM64')
    : m.assets.some(a => a.platform === 'linux-amd64' && typeof a.label === 'string');
}
export async function loadRelease(env, kind) {
  try {
    const value = await env.RELEASES?.get(releaseKeys[kind], { type: 'json', cacheTtl: 60 });
    if (validRelease(kind, value)) {
      // Older CI manifests omitted desktop/TV assets. Supplement only the same
      // release from the verified bundled snapshot; never mix version tags.
      if (kind === 'app' && value.tag === snapshots.app.tag) {
        const names = new Set(value.assets.map(a => a.name));
        return {...value, assets: sortAppAssets([...value.assets, ...snapshots.app.assets.filter(a => !names.has(a.name))])};
      }
      return value;
    }
  } catch {}
  return snapshots[kind];
}

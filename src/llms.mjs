import {appPlatforms} from './app-assets.mjs';
import {copy} from '../content/copy.mjs';
import {services} from './render.mjs';

const origin = 'https://openplayx.com';
const gh = 'https://github.com/openplayx';
const platformKeys = {macos:'mac', windows:'windows', linux:'linux', android:'android', 'android-tv':'tv', tvos:'appleTv'};

export const docIndex = [
  ['', 'Welcome to OpenPlayX', 'Overview, platform availability and quick paths.'],
  ['getting-started/first-video/', 'Play your first video', 'Install on macOS, Windows, Linux or Android and play your first local or network video.'],
  ['getting-started/tv/', 'Android TV & Apple TV', 'Install the Android TV APK or Apple TV (tvOS) build via TestFlight or re-signed IPA.'],
  ['playback/engines-and-pip/', 'Playback engines & Picture-in-Picture', 'How libmpv default playback, libVLC automatic fallback and desktop/mobile PiP work.'],
  ['playback/subtitles/', 'Subtitles: generation & alignment', 'Full subtitle generation (Groq free proxy, local whisper.cpp, custom API) and SRT alignment.'],
  ['sources/smb/', 'Connect an SMB share', 'Add and browse SMB shares on a NAS or home server.'],
  ['sources/media-servers/', 'Media servers & network protocols', 'Connect Jellyfin (with Direct Play / Remux / Transcode fallback), Plex, Emby, WebDAV, FTP/SFTP, S3, DLNA and local discs.'],
  ['sources/cloud-drives/', 'Cloud drives', 'Jianguoyun and 123 Cloud Drive WebDAV presets plus OneDrive, Dropbox and Baidu Netdisk OAuth setup.'],
  ['library/home/', 'Build your Home library', 'Scan folders into a local library with posters, episodes, NFO/TMDB metadata and watch progress.'],
  ['ai/models/', 'Configure an AI model', 'Connect any OpenAI-compatible model endpoint and API key for the optional assistant.'],
  ['ai/mcp/', 'Connect MCP tools', 'Add external HTTP MCP servers and save completed downloads directly to SMB, WebDAV or SFTP sources.'],
  ['remote-access/connector/', 'Access media with Connector', 'Expose home media services remotely through OpenPlayX Connector and Platform Relay.'],
  ['help/faq/', 'Frequently asked questions', 'Platforms, account requirements, data storage, security and issue reporting.'],
];

export function renderLlmsTxt(releases) {
  const platforms = appPlatforms
    .filter(p => releases.assets.some(a => a.platform === p))
    .map(p => copy.en[platformKeys[p] + 'Title']);
  const mcpLines = services.map(([name, , license]) =>
    `- [${name}](${gh}/${name}) (${license}): ${copy.en.serviceNames[name][0]} — ${copy.en.serviceNames[name][1]}`
  );
  const docLines = docIndex.map(([route, title, summary]) =>
    `- [${title}](${origin}/docs/${route}): ${summary}`
  );
  return `# OpenPlayX

> Open-source, local-first media player powered by Flutter, libmpv and libVLC. Connects local folders, NAS (SMB, WebDAV, FTP/SFTP, S3, DLNA), media servers (Jellyfin, Plex, Emby) and cloud drives (OneDrive, Dropbox, Baidu Netdisk, Jianguoyun, 123 Cloud Drive), with AI subtitle generation & alignment, Picture-in-Picture, bring-your-own LLM, an open MCP ecosystem, and optional Connector remote access.

## Key Facts

- **Current release**: ${releases.tag} (${releases.url})
- **Supported platforms**: ${platforms.join(', ')} (iOS public installer is not yet published; Flutter Web playback is not supported)
- **Playback engines**: \`libmpv\` (default, built on FFmpeg 9.1) with automatic \`libVLC\` fallback
- **Privacy & local-first boundary**: Local playback and library indexing require no OpenPlayX account and no AI subscription. OpenPlayX does not bundle movies, TV shows or IPTV/live TV streams.
- **Subtitles**: Full-length ASR subtitle generation via free Groq platform proxy (Whisper V3, no client API key), local \`whisper.cpp\` models, or custom OpenAI-compatible / \`openplayx-asr\` endpoints, plus local SRT timing alignment.
- **License**: Original main app code is MIT; combined builds linking \`sing-box\` also follow GPL terms. Ecosystem MCP services are MIT or GPLv3.
- **Full documentation corpus**: [${origin}/llms-full.txt](${origin}/llms-full.txt)

## Website

- [Home (English)](${origin}/): Product overview, supported sources, AI workflow and FAQ.
- [首页 (简体中文)](${origin}/zh/): Chinese product overview and FAQ.
- [Download](${origin}/download/): Official installers for macOS (DMG/ZIP), Windows (EXE/ZIP), Linux (AppImage), Android, Android TV and Apple TV (tvOS), plus SHA-256 checksums.
- [MCP Ecosystem](${origin}/ecosystem/): Self-hostable MCP services for search, metadata, downloads and speech recognition.
- [Contribute](${origin}/contribute/): Bug reporting, code contributions and MCP integration guidelines.
- [Privacy](${origin}/privacy/): Website analytics and application data boundaries.

## Documentation (English & 简体中文)

Chinese equivalents live under \`${origin}/docs/zh-Hans/\` with identical paths.

${docLines.join('\n')}

## Open MCP Ecosystem Repositories

${mcpLines.join('\n')}
`;
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

export function renderLlmsFullTxt(releases, docs = []) {
  const header = renderLlmsTxt(releases).trimEnd();
  if (!docs.length) return header + '\n';
  const sections = docs.map(({route, title, content}) =>
    `---\n\n## ${title}\nSource: ${origin}/docs/${route}\n\n${stripFrontmatter(content)}`
  );
  return `${header}\n\n# Full Documentation\n\n${sections.join('\n\n')}\n`;
}

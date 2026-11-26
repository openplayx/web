import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { render, pages } from '../src/render.mjs';
import { renderLlmsTxt, renderLlmsFullTxt } from '../src/llms.mjs';
import releases from '../content/releases.json' with { type: 'json' };
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL('public/', root), dist, { recursive: true });
// Theme preference script shared with the account center (ui/opx-theme.js): follows the OS by default.
await cp(new URL('ui/opx-theme.js', root), new URL('assets/opx-theme.js', dist));
await build({entryPoints:[new URL('src/analytics.js',root).pathname],bundle:true,minify:true,
  format:'iife',platform:'browser',target:'es2020',outfile:new URL('assets/analytics.js',dist).pathname});
for (const lang of ['en', 'zh']) {
  for (const page of pages) {
    const path = `${lang === 'zh' ? 'zh/' : ''}${page ? page + '/' : ''}`;
    await mkdir(new URL(path, dist), { recursive: true });
    await writeFile(new URL(`${path}index.html`, dist), render(lang, page));
  }
}
await writeFile(new URL('404.html', dist), render('en', '', true));
const aiBots = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot'];
const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /account/',
  'Disallow: /v1/',
  'Disallow: /adminzzz/',
  '',
  ...aiBots.flatMap(bot => [`User-agent: ${bot}`, 'Allow: /', 'Disallow: /account/', 'Disallow: /v1/', '']),
  'Sitemap: https://openplayx.com/sitemap.xml',
  '',
].join('\n');
await writeFile(new URL('robots.txt', dist), robots);
const lastmod = releases.checkedAt || new Date().toISOString().slice(0, 10);
const pageUrl = (lang, page) => `https://openplayx.com/${lang === 'zh' ? 'zh/' : ''}${page ? page + '/' : ''}`;
const urlEntries = ['en','zh'].flatMap(lang => pages.map(page =>
  `<url><loc>${pageUrl(lang, page)}</loc><lastmod>${lastmod}</lastmod><xhtml:link rel="alternate" hreflang="en" href="${pageUrl('en', page)}"/><xhtml:link rel="alternate" hreflang="zh-CN" href="${pageUrl('zh', page)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('en', page)}"/></url>`
));
await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urlEntries.join('')}</urlset>\n`);
await writeFile(new URL('llms.txt', dist), renderLlmsTxt(releases));
await writeFile(new URL('llms-full.txt', dist), renderLlmsFullTxt(releases));
await writeFile(new URL('release.json', dist), JSON.stringify(releases, null, 2)+'\n');
console.log(`Built ${urlEntries.length} localized pages + 404 + llms.txt. Release: ${releases.tag}`);

import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { render, pages } from '../src/render.mjs';
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
await writeFile(new URL('robots.txt', dist), 'User-agent: *\nAllow: /\nSitemap: https://openplayx.com/sitemap.xml\n');
const routes = ['en','zh'].flatMap(lang => pages.map(page => `https://openplayx.com/${lang === 'zh' ? 'zh/' : ''}${page ? page + '/' : ''}`));
await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(loc => `<url><loc>${loc}</loc></url>`).join('')}</urlset>\n`);
await writeFile(new URL('release.json', dist), JSON.stringify(releases, null, 2)+'\n');
console.log(`Built ${routes.length} localized pages + 404. Release: ${releases.tag}`);

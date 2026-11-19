# Sources and acknowledgements

English | [简体中文](SOURCES.zh-CN.md)

This document records verifiable sources for the website's code, dependencies
and assets. We thank their maintainers. Design references, direct dependencies
and copied assets are documented separately; each upstream retains its license.

## Open-source dependencies

| Project | Use on this website | Version authority | License source |
|---|---|---|---|
| [PostHog JS](https://github.com/PostHog/posthog-js) | Browser analytics SDK used by `src/analytics.js`; bundled locally and enabled after consent | `package-lock.json`; current direct dependency 1.451.2 | Apache-2.0; [preserved original text](public/licenses/posthog-js.txt) |
| [esbuild](https://github.com/evanw/esbuild) | Bundles the analytics script at build time | `package-lock.json`; current direct dependency 0.28.2 | [MIT](https://github.com/evanw/esbuild/blob/main/LICENSE.md) |
| [Cloudflare Workers SDK / Wrangler](https://github.com/cloudflare/workers-sdk) | Static asset deployment and local development tooling | `package-lock.json`; current direct dependency Wrangler 4.162.0 | MIT OR Apache-2.0; refer to the installed package's license files |

This table lists direct dependencies. `package-lock.json` records the full npm
dependency resolution, including transitive dependencies. Build tools are not
loaded as separate browser runtimes. `public/licenses/` is copied into
`dist/licenses/` with the static assets. If the bundler also generates
`analytics.js.LEGAL.txt`, distribute it alongside the script rather than removing it.

## Pages, icons and illustrations

- Bilingual copy, page templates, styles and interactions live in `content/`,
  `src/` and `public/assets/`, published as the website source maintained here.
- `afterglow.svg`, `orbit.svg` and `north.svg` are original sample illustrations
  for this website. Film names, years, playback positions and the interface
  illustration are fictional. See the existing [asset notices](public/NOTICE.md).
- The OpenPlayX mark and application icon come from the OpenPlayX project's
  design assets. Names, trademarks and logos do not imply third-party endorsement;
  publishing source code does not grant trademark rights.
- Interface icon paths are stored directly in `src/render.mjs`; no external icon
  library is installed. Existing history does not record an upstream mapping for
  each icon, so this does not establish that every icon is independently original.
  When adding or identifying upstream paths, record the project, file, version
  and original license notices.

## Scope of design reference records

Existing repository history does not identify verifiable external website
templates or design reference projects, so this document does not speculate
about them. For new references, record the project link, referenced page or
interaction, corresponding implementation files, and whether source or assets
were copied or adapted. Copies and adaptations also require preservation of the
original copyright and license texts. A reference or acknowledgement does not
replace provenance documentation for code and assets actually used.

## Maintenance

When upgrading dependencies, review this inventory, the lockfile and distributed
license texts together. Original website code uses [MIT](LICENSE); dependencies
retain their own terms. Consult the individual repositories for the application,
player and ecosystem services' sources and licenses. This inventory does not
indicate that those components are included in the website.

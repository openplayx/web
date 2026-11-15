# Contributing

Report issues and propose focused changes through this repository's GitHub
issues and pull requests. Include affected routes, language, browser and
viewport for UI problems. Keep English and Chinese copy in sync.

Requires Node.js 22+. Run `npm ci`, `npm run build` and `npm run check`.
Check changed layouts in desktop/mobile browsers and verify localized links.
Release links must come from reviewed public GitHub release metadata.

Do not commit credentials, private media, `.dev.vars` or `.wrangler` state.
Deployment requires separate operator authorization; a contribution does not
authorize changes to hosting, DNS or another Worker.

Original contributions are under the repository's [MIT license](LICENSE).
Preserve attribution and [asset notices](public/NOTICE.md). App and service
licenses are independent. Report vulnerabilities using [SECURITY.md](SECURITY.md).

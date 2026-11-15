# Deployment status

Checked on 2026-11-15.

## Live website

- Worker: `openplayx-web`, Cloudflare Workers Static Assets.
- Production: https://openplayx.com/ and https://www.openplayx.com/.
- Production Chinese: https://openplayx.com/zh/.
- Deployed version: `150f7246-bf17-42fd-8ac5-47c676ce71a2`.
- Default English: https://openplayx-web.zhyoulun.workers.dev/
- Chinese: https://openplayx-web.zhyoulun.workers.dev/zh/
- All 10 localized pages, CSS and JavaScript returned HTTP 200; an unknown path returned HTTP 404. Security headers were present.
- Desktop and mobile browser checks covered language switching, the mobile navigation, illustrative preview tabs and download pages.
- `npm run build`, `npm run check` and Wrangler's deployment dry run passed. The checker validated 212 local references and release metadata.

## Custom domains verified

The owner removed conflicting DNS records, after which `npm run deploy` successfully attached both production domains. Public DNS (1.1.1.1) resolves them to Cloudflare.

Both production hosts passed HTTPS checks for English and Chinese homepages, download pages, CSS and an unknown-path 404. Local DNS still returned the old address at verification time, so these checks connected to the public DNS result using curl `--resolve`, retaining hostname and TLS certificate verification. No certificate checks were disabled.

For subsequent deployments:

```sh
npm run deploy
```

The configured canonical URLs and sitemap target `https://openplayx.com`. The `workers.dev` URL stays available as a preview. Deployment touches only this website Worker and its two custom domains; the existing MCP service is separate.

No credentials are stored in this repository. Deployment uses the operator's local Wrangler authentication.

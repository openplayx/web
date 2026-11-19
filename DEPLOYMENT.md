# Deployment status

Checked on 2026-11-19.

## Live website

- Worker: `openplayx-web`, Cloudflare Workers Static Assets.
- Production: https://openplayx.com/ and https://www.openplayx.com/.
- Production Chinese: https://openplayx.com/zh/.
- Deployed version: `b580907f-83b7-4209-a3df-d493d42bd109`.
- Default English: https://openplayx-web.zhyoulun.workers.dev/
- Chinese: https://openplayx-web.zhyoulun.workers.dev/zh/
- All 10 localized pages, CSS and JavaScript returned HTTP 200; an unknown path returned HTTP 404. Security headers were present.
- Desktop and mobile browser checks covered language switching, the mobile navigation, illustrative preview tabs and download pages.
- `npm run build`, `npm run check` and deployment passed. The checker validated 222 local references and release metadata.

## PostHog update

Optional analytics is now live with English/Chinese consent controls and footer withdrawal. The SDK is bundled locally; CSP allows the US ingestion host. Replay, autocapture, heatmaps, surveys and automatic error collection are disabled. Project ID: 748276. Source contains a public Project Token only; no Personal API Key.

Consent rejection persisted across reload; enabling and withdrawal worked on the production domain. Both domains served the bundle and Chinese privacy page over HTTPS with the expected CSP. Website unit tests cover no initialization before consent, required ingestion token preservation, private URL/referrer removal and withdrawal. Local test events reached PostHog with sanitized URLs and channel attribution; use `?analytics_test=1` for production-domain validation.

`www.openplayx.com` continues to serve the site directly. A proposed host-based `_redirects` rule was rejected by Workers Static Assets and removed before successful deployment.

## Custom domains verified

The owner removed conflicting DNS records, after which `npm run deploy` successfully attached both production domains. Public DNS (1.1.1.1) resolves them to Cloudflare.

Both production hosts passed HTTPS checks for English and Chinese homepages, download pages, CSS and an unknown-path 404. Local DNS still returned the old address at verification time, so these checks connected to the public DNS result using curl `--resolve`, retaining hostname and TLS certificate verification. No certificate checks were disabled.

For subsequent deployments:

```sh
npm run deploy
```

The configured canonical URLs and sitemap target `https://openplayx.com`. The `workers.dev` URL stays available as a preview. Deployment touches only this website Worker and its two custom domains; the existing MCP service is separate.

No credentials are stored in this repository. Deployment uses the operator's local Wrangler authentication.

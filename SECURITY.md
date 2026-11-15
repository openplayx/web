# Security policy

Report vulnerabilities through GitHub's **Security → Report a vulnerability**
when available. Otherwise contact a maintainer using published GitHub profile
contact details; do not publish secrets or exploit details in an issue.
Include the affected route/commit, reproduction steps and impact with
synthetic data. Only the current main branch is maintained.

This repository is a static website, not the Flutter player or an MCP service.
Report app/service vulnerabilities to their corresponding repositories.
Never include Cloudflare OAuth credentials, API tokens, `.dev.vars` or local
Wrangler state in source, build output or reports. Deployment and domain
changes require the operator's authorization.

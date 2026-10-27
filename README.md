# WebInspectAI

## Local development

```bash
npm install
npm run browser:install
npm run dev
```

The accessibility, responsive-layout, and Lighthouse performance audits use the Chromium binary installed by Playwright. Install Chromium once after installing dependencies, and include `npm run browser:install` in deployment image setup. Lighthouse does not download a second browser.

## Grounded UI/UX analysis

Copy `.env.example` to `.env.local` and configure the server-only provider variables when AI-assisted UI/UX synthesis is wanted:

```bash
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_API_KEY` must never use a `NEXT_PUBLIC_` prefix. If it is absent, the deterministic audit still completes and the report shows UI/UX analysis as unavailable.

The provider-neutral AI layer currently includes an isolated OpenAI Responses API adapter using strict structured output. Each audit makes at most one AI request, capped at 1,600 output tokens and 20 seconds, with no automatic repair retry. The normalized input is deliberately compact and suitable for future hashing/caching: it includes selected SEO structure, Lighthouse metrics/opportunities, mobile findings, axe violations, internal-link counts, HTTPS state, and a bounded evidence catalog. It excludes raw HTML, raw headers, cookies, query strings, browser storage, environment data, and secrets.

Website-derived text is passed only inside a delimited untrusted evidence payload, never in provider instructions. Model output is runtime-validated, unknown evidence references are rejected, and the numeric UI/UX score is calculated deterministically from validated issue severity and confidence. Screenshots are not sent in this milestone; existing temporary mobile screenshots remain in memory and are discarded.

AI usage introduces one variable-cost request per configured audit. Input arrays and text lengths, output tokens, call count, and timeout are centrally capped. The provider boundary can later move behind a queue, rate limiter, cache, or dedicated worker without changing report components.

## Lighthouse performance runtime

Performance audits use Lighthouse's focused performance category with its simulated mobile profile. Lighthouse runs in a fresh Chromium process and temporary browser profile after the accessibility and mobile analyzers complete; this isolation keeps its debugging lifecycle independent and avoids running all browser-heavy analyzers concurrently. The process and profile are cleaned up on success, failure, and the 55-second audit timeout.

The requested URL is validated before Chromium launches. During the run, Playwright attaches over the local DevTools port and intercepts every browser request: only HTTP(S) GET/HEAD requests whose host resolves exclusively to public IP space are allowed. Private, local, metadata, unsupported-scheme, and unsafe redirect destinations are blocked. The final Lighthouse URL is validated again before a result is accepted.

Only normalized scores, metrics, selected aggregate diagnostics, up to 10 opportunities, and up to 12 findings are returned. Raw Lighthouse reports, traces, DevTools logs, request arrays, artifacts, and screenshots are not exposed.

Browser-heavy audits are a better fit for a dedicated worker or container than a tightly limited serverless function. The auditor is isolated behind a typed module so it can move to a queue/worker in a later milestone without changing frontend components.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:accessibility
npm run test:mobile
npm run test:performance
npm run test:ai
npm run build
npm audit
```

## Deployment

WebInspectAI is ready for production.

### Hosting Provider: Render

We recommend **Render** for deployment using the provided `Dockerfile`. Render natively supports long-running Node containers, has outbound internet access, and handles SSL/TLS automatically.

1. **Service Configuration**: 
   - Create a new **Web Service** on Render.
   - Select the repository.
   - Choose **Docker** as the Environment.
   - **Region**: Select a region close to your target audience.
   - **Instance Type**: Select **Starter** or higher (at least 2 vCPU and 2-4 GB RAM) because headless Chromium requires substantial memory.
2. **Environment Variables**:
   - `BASE_URL`: `https://www.webinspectai.com`
   - `OPENAI_API_KEY`: (Optional) Your OpenAI key for UI/UX analysis.
   - `OPENAI_MODEL`: `gpt-4o-mini`
   - `AUDIT_TIMEOUT_SECONDS`: `90`
   - `RATE_LIMIT_MAX`: `3`
   - `RATE_LIMIT_WINDOW_SECONDS`: `3600`
   - `MAX_CONCURRENT_AUDITS`: `2`
3. **Health Check**: Set the Health Check Path to `/api/health`.
4. **Deploy**: Render will automatically build the `Dockerfile` and start the container.

### Domain Configuration

1. **Custom Domain**: In the Render dashboard, navigate to **Settings** > **Custom Domains** and add `www.webinspectai.com` and `webinspectai.com`.
2. **DNS Records**:
   - Create a **CNAME** record for `www` pointing to your Render `onrender.com` URL.
   - Create an **A/ALIAS** record for the root (`webinspectai.com`) pointing to Render's IP address (provided in the dashboard).
3. Render automatically provisions TLS/SSL certificates and forces HTTP to HTTPS.

### Google Search Console

1. Add `https://www.webinspectai.com` as a URL prefix property.
2. Use HTML tag verification or DNS TXT verification.
3. Submit the sitemap: `https://www.webinspectai.com/sitemap.xml`.

### Rollback Procedure

If a deployment breaks, go to the **Events** tab in Render, select the previous successful deployment, and click **Rollback**.

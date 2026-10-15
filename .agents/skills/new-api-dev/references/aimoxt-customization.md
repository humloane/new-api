# AIMOXT Customization Map (local fork)

Source of record: `.agents/notes/new-api-analysis.md` §1 (snapshot 2026-10-15).
This file is a **summary for on-demand lookup only** — verify each path exists
and read the actual file before modifying it. The fork's own changes are
concentrated in the **web frontend layer and deployment config; the Go backend
has no fork-layer modifications** (per the snapshot; re-verify if the task
depends on it).

## Branches / commits to be aware of

- `backup/pre-aimoxt-landing-20260925` — backup point before the landing redesign (diffing against it reveals the full AIMOXT delta).
- `aimoxt/landing-redesign` (PR #1, merged) — 31 files, +3515/−1159.
- A few commits for Docker Compose deployment config + URL-safe password docs.

## AIMOXT customization files (verify paths before use)

| File | Purpose |
| --- | --- |
| `web/src/lib/site-seo.ts` | Brand + SEO core: `SITE_TITLE` ("AIMOXT" brand string), `parseSiteOrigin` validating `VITE_PUBLIC_SITE_URL` as pure HTTPS origin; dynamic `robots.txt` / `sitemap.xml` generation |
| `web/site.config.json` | `{"publicSiteUrl": ""}` — public site origin config |
| `web/src/styles/landing.css` | Landing page styles (~933 lines) |
| `web/src/features/home/` | Redesigned landing page: `index.tsx`, `types.ts`, `api.ts`, `constants.ts`, `lib/`, `hooks/`; `components/` (hero-buttons, hero-terminal-demo, landing-illustrations, gateway-card, etc.), `components/sections/` (hero, features, how-it-works, stats, cta, developer-guide) |
| `web/src/features/home/__tests__/landing-page.test.tsx` | Landing page tests (~523 lines) |
| `web/src/lib/__tests__/site-seo.test.ts` | SEO utility tests |
| `web/src/components/layout/components/footer.tsx`, `public-header.tsx` | Branded footer / public header |
| `web/src/main.tsx`, `web/src/routes/__root.tsx`, `web/src/routes/index.tsx` | SEO/brand mount points |
| `web/src/i18n/locales/*.json` (7 locales) | ~+617/−8 lines of landing/brand copy added to the shared locale files |
| `web/index.html`, `web/rsbuild.config.ts` | SEO asset injection: rsbuild plugin generating robots/sitemap/JSON-LD in production builds |
| `web/src/features/system-settings/general/system-info-section.tsx` | Landing-related system info copy |

## Rules when touching AIMOXT surfaces

1. Never delete or overwrite AIMOXT brand/SEO files in unrelated changes.
2. Locale files are shared with upstream: adding landing copy must go through the `i18n-translate` skill (script + `bun run i18n:sync`) and stay consistent across all 7 locales.
3. Changes to `web/rsbuild.config.ts` SEO plugin or `site-seo.ts` affect production output (`robots.txt`, `sitemap.xml`, JSON-LD) — run `bun run build` and `bun run test` (from `web/`) and inspect generated assets.
4. The AIMOXT brand layer sits **on top of** protected upstream identity (`new-api` / `QuantumNous`). Branding additions are fine where the fork already places them; removing protected identifiers is never allowed (see `AGENTS.md` Project Governance).
5. Future upstream merges will likely conflict in `web/src/features/home/`, locale files, `web/rsbuild.config.ts`, and `web/index.html` — keep AIMOXT changes localized and review the diff against `origin/backup/pre-aimoxt-landing-20260925` when in doubt.

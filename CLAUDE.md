# Project rules

## This site must NOT be indexed by search engines

- Every HTML page must include in `<head>`:
  `<meta name="robots" content="noindex, nofollow, noarchive">`
- `vercel.json` sends `X-Robots-Tag: noindex, nofollow, noarchive` on every route. Do not remove it.
- Do NOT add `Disallow` rules to `robots.txt` — blocking crawling stops search engines from seeing the noindex directive, and blocked URLs can still appear in results.
- Do not generate a sitemap.

## Design

Use the `frontend-design` skill (`.claude/skills/frontend-design/SKILL.md`) when building UI.

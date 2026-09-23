# Clerko M&A — wireframe project

Interactive single-file prototype (blue/indigo/purple + green marketplace theme, 19 views).

## Files in this folder
- `clerko-ma-site.html` — **the deliverable** (single self-contained interactive site).
  Delivered via the Cowork chat; drop it into this folder so the file lives alongside its record.

## What it is
- **Marketing:** Home, Marketplace (search + filters), Pricing (seller/buyer toggle), Variations.
- **Flows (June 2026 user-scenarios spec):** Platform hub · Seller (verify → listing → tier →
  review → dashboard) · Buyer (prefs → teaser → NDA → unlock → Company Details Pack) · Deal Room
  with the **Clerko Agent** panel (mediates, never advises/decides) · Escrow (deferred/context).
- **Dashboards:** User Workspace (seller/buyer role switch, KPIs, charts, deal rooms) and Admin
  Console (platform KPIs, moderation queue, users/KYC, compliance). All charts are inline SVG.
Works even when JavaScript is restricted (sandbox-safe router + pure-CSS checkbox menus).

## Open item
Align the flows/dashboards to the published `gray-split-80777604.figma.site` when the Chrome
extension is connected.

## Reusable method
See `../ai-prototyping-kit/` for the skill (`SKILL.md`), component library, build record, and
starter scaffold used to build this.

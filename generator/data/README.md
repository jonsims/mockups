# The data layer — the CMS contract

Everything on this site renders from these JSON files. They are the prototype's
argument to Babson's web team: **this is the structured content the CMS needs to
produce for the site to work as a living reference hub.** The build script
(`../build.py`) plays the role of the CMS template layer; the client JS
(`../js/`) consumes the same files at runtime for the dynamic surfaces.

| File | Contains | Renders |
|---|---|---|
| `labs.json` | 8 Specialty Labs: focus questions, impacts, leaders, initiatives, intern roles, editorial pin order | Labs directory, 8 lab detail pages, homepage grid |
| `people.json` | 11 faculty leaders (quotes, interests, bios, publications) + student highlights | Leader cards, search, homepage student module |
| `events.json` | All events, timezone-aware, with audience / lab / theme / beginner tags | Events page, This Week strip, lab rails, .ics exports |
| `news.json` | 14 news items with lab attribution + themes | Homepage news module, Questions Worth Asking, lab rails |
| `community.json` | 7 standing programs, acronyms expanded | Community directory, search |
| `site.json` | Org identity, hero copy, sourced stats, quick-action cards | Homepage |
| `matcher.json` | Find-your-lab weights + role-forked next steps — fully transparent | The matcher on the labs page |

## Rules that keep the hub honest

- **Controlled vocabularies.** `audience` ∈ {Students, Faculty, Community, Small
  Business Owners} — always spelled out. `themes` ∈ {Innovation, Critical
  Inquiry, Ethics & Policy, Hands-On}. Free-typed variants break filters silently.
- **Every event and news item carries `lab_ids`** (or `org_wide: true`). This is
  what feeds the "From this lab" rails and per-lab counts — the cross-links are
  the product.
- **`sample: true`** marks illustrative future events (needed to demo dynamic
  surfaces). They are visibly badged everywhere they render. Never let sample
  data pass as real.
- **No unsourced stats.** Every number in `site.json` carries a `source` and an
  `href`.
- **`pin_position`** in `labs.json` sets display order editorially, so
  low-event-volume labs (Ethics & Society, Work Futures) are never buried by
  activity-volume sorting.
- **Dates are ISO-8601 with the correct ET offset.** The .ics generator depends
  on this.
- Update `last_updated` when you touch a file — it renders in the footer.

After editing: `python3 build.py` from the project root regenerates all pages.

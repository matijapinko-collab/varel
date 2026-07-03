# Content guide (for the owner)

Everything on the public site is edited at **/admin** — no code needed.

## Daily workflow (Croatian-first)

1. Create content in **Croatian** (every "New …" form starts in Croatian ✍️).
2. Fill the content, set its status to **published** when ready.
3. Open **Translations**, click **+** next to the language you want (start
   with EN). A draft copy is created — titles are marked `[TRANSLATE]`.
4. Open the draft (language tabs at the top of each editor), translate the
   text, fill the SEO section for that language, set status **published**.
5. Nothing is ever auto-published — you always review first.

## Where things live

| I want to… | Go to |
|---|---|
| Edit the homepage sections | Pages → Home → (builder) |
| Add a tool to the directory | Tools → + New tool |
| Feature a tool on the homepage | Tools → edit → check "Featured" or "Trending" |
| Write a comparison (X vs Y) | Comparisons |
| Write a guide / SEO article | Guides (choose Cornerstone ≈1500 words or Standard ≈500) |
| Write my column | Editorial (The Varel Brief) |
| Add news | News |
| Add a prompt | Prompts |
| Add a deal | Deals |
| Manage an affiliate program URL | Affiliate Manager (content uses `/go/<id>` automatically) |
| Upload images / the logo | Media Library, then Branding to assign logos |
| Change colors, theme, site name | Branding |
| Edit navigation | Menus |
| Edit legal pages (privacy, terms…) | Pages |
| Check SEO problems | SEO Manager |
| See traffic & affiliate clicks | Dashboard / Analytics |
| Export newsletter emails | Newsletter → Export CSV |
| Add an editor/translator account | Users |

## Editor tips

- **Slugs** are the URL part (`/en/tools/claude`). Keep them short, lowercase,
  hyphenated. Each language can have its own slug.
- **SEO section** (bottom of every editor): meta title ≤ 60 chars, description
  ≤ 160 chars, one focus keyword. The SEO Manager flags anything missing.
- **List fields** use one item per line. FAQ fields use
  `Question | Answer` per line.
- **HTML fields** accept simple HTML: `<h2>`, `<p>`, `<ul><li>`, `<a href>`,
  `<strong>`. Ask Claude to convert text to clean HTML if unsure.
- Content marked `[SAMPLE]` came with the initial setup — replace or archive it
  before launch.

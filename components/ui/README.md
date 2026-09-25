# components/ui

shadcn-style React components, kept here for a future React/Next.js version of
the Allied Industries site. The live site (`allied-industries-website/`) is
static HTML/CSS/JS with no build step, so it cannot import `.tsx` files.

- `shiny-button.tsx` — `ShinyButton`, copied verbatim. Its effect is ported to
  plain CSS in `allied-industries-website/assets/css/styles.css` (section
  "SHINY BUTTON"), where every `.btn-primary` and the floating call button use
  it with the brand props: fill `#2A211B`, label `#F2EDE6`, accent `#C8763F`,
  soft accent `#E7B592`, 3 s sweep, 0.8 s ease, 5 % arc, pill corners.
- `demo.tsx` — the component's demo page.

To use these directly, the site would need to move to a React project with the
shadcn structure (TypeScript, Tailwind, `@/` alias to the project root):

    npx create-next-app@latest allied-web --typescript --tailwind --eslint --app
    cd allied-web
    npx shadcn@latest init        # writes components.json, sets components/ui
    # then copy this folder's files into allied-web/components/ui/

shadcn's CLI adds components to `components/ui`, and `@/components/ui/...`
imports assume that path, so keeping components there means copied
components, and ones added later with `npx shadcn add`, resolve without
rewriting imports. No extra npm packages are needed: the component only
uses React.

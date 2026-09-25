# components/ui

shadcn-style React components, kept here for a future React/Next.js version of
the Allied Industries site. The live site (`allied-industries-website/`) is
static HTML/CSS/JS with no build step, so it cannot import `.tsx` files; each
component's effect is ported to plain CSS/JS there instead.

| File | Component | Where the site uses its effect |
| --- | --- | --- |
| `shiny-button.tsx` | `ShinyButton` | Every `.btn-primary` and the floating call button — `styles.css`, section "SHINY BUTTON" (brand props: fill `#2A211B`, accent `#C8763F`, soft accent `#E7B592`, 3 s sweep, pill corners) |
| `stacking-card.tsx` | stacking cards (`Card`, default `Component`) | Home page "What we manufacture" — `styles.css` section "What we manufacture" (sticky cards) and `assets/js/home-stack.js` (scale-down of covered cards, photo zoom from `useScroll`/`useTransform`) |
| `shiny-button-demo.tsx`, `stacking-card-demo.tsx` | the components' demos | — |

`stacking-card.tsx` imports `cn` from `@/lib/utils`; that helper is in
`lib/utils.ts` at the repo root, as `shadcn init` would create it.

## Setting up a React project that can use these directly

The site would need to move to a React project with the shadcn structure
(TypeScript, Tailwind, the `@/` alias pointing at the project root):

    npx create-next-app@latest allied-web --typescript --tailwind --eslint --app
    cd allied-web
    npx shadcn@latest init            # writes components.json and lib/utils.ts,
                                      # sets the components path to components/ui
    npm install lenis motion          # stacking-card.tsx
    # clsx + tailwind-merge come with `shadcn init` (used by lib/utils.ts)
    # then copy this folder's files into allied-web/components/ui/

shadcn's CLI adds components to `components/ui`, and imports such as
`@/components/ui/stacking-card` assume that path, so keeping components there
means copied components, and ones added later with `npx shadcn add`, resolve
without rewriting imports.

## What the static port deliberately leaves out

- **Lenis smooth scrolling** (`<ReactLenis root>`): it takes over the page's
  scrolling, which would fight the Products configurator's drag/zoom canvas
  and the scroll-driven reveals. The stack works with native scrolling.
- **One screen of scroll per card** (`h-screen` wrappers): on a 14" laptop that
  made the section five screens long. Cards are sized to the viewport under the
  header and follow each other directly.

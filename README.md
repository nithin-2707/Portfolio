# Nithin Gandrathi · Portfolio

My personal portfolio, designed and built as a road atlas you drive through. Scrolling is the throttle: one orange route runs down the whole page, and every section is a waypoint with its own instrument, each one carrying real information about my work.

## Highlights

- **Tachometer launch:** the needle climbs to the redline, the shift lights flash, and the site opens through an iris at the hub.
- **Race-circuit hero:** a drawn circuit map whose five sectors are the five areas I work in. A car laps it and cues each sector.
- **The route so far:** a stage profile of 2022 to 2026, with study, projects, internships and certifications laid out in lanes.
- **Stages:** my internships as one ruled rally sheet. The section pins, and scroll drives a road along the bottom; each stage's pace notes light up as the road passes them.
- **Service park:** how I work, as four service bays that open one by one as you scroll.
- **Builds and Side roads:** project chapters with uncropped screenshot galleries, plus a hover-preview list of smaller builds.
- **Gearbox:** skills on an H-pattern shifter you can drag, click or drive with the keyboard.
- **Licences:** certifications on a scroll-driven WebGL arc.
- **Car cursor:** on desktop, the pointer is a small car that steers the way you move and leaves a fading trail.

## Tech stack

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · GSAP with ScrollTrigger · Lenis · Motion · OGL (WebGL)

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Script | What it does |
|---|---|
| `npm run build` | Production build (every route is static) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check, no output |

## Configuration

One optional environment variable sets the site's public URL, used for the canonical link, Open Graph, `sitemap.xml` and `robots.txt` (see `.env.example`):

| Name | Example |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nithin-gandrathi.vercel.app` |

On Vercel, the project's production domain is used when it is not set.

## Project structure

```
src/
  app/            layout, page, metadata, sitemap, robots, Open Graph image, 404
  content/        site.ts (all copy and links), areas.ts (hero sectors), timeline.ts (stage profile)
  components/
    launch/       tachometer loader
    nav/          route-line navigation, odometer, mobile route map
    hero/         race-circuit hero
    routeprofile/ the route so far, 2022 to 2026
    profile/      bio, rally roadbook, road signs
    stages/       internships: pinned rally sheet with pace notes and a road band
    servicepark/  how I work: four service bays
    builds/       project chapters and screenshot galleries
    sideroads/    smaller projects
    gearbox/      skills shifter
    licences/     certifications
    finish/       contact
    footer/       marquee and trip computer
    cursor/       car cursor
    route/        the orange route drawn down the page
  lib/            GSAP setup, scroll state, font loading, hooks
public/           screenshots, icons, resume
```

All content lives in `src/content/site.ts`.

## Accessibility and performance

- Every page is server-rendered and static; the launch animation is an overlay that crawlers and visitors without JavaScript never see.
- `prefers-reduced-motion` keeps fades but removes travel, pinning, 3D motion and the car cursor.
- Every control works with a keyboard and has a visible focus ring.
- Motion runs on transforms and opacity, and heavy canvases pause when they are off screen.

## Credits

| Asset | Source | Licence |
|---|---|---|
| Panchang, Satoshi | [Fontshare](https://www.fontshare.com) by Indian Type Foundry | ITF Free Font License. The font files are not part of this repository; the site loads them from Fontshare. |
| JetBrains Mono | [JetBrains](https://www.jetbrains.com/lp/mono/) | SIL Open Font License, see `src/app/fonts/LICENSE-OFL-JetBrainsMono.txt` |
| Brand and tool icons | [theSVG](https://thesvg.org) | Each mark belongs to its owner and is shown only to name the tool. |
| AccordionGallery, CircularGallery, ScrollReveal, StrokeText, FoldText, HoldButton, ScrollVelocity, Counter, WarmTooltip | Adapted from [React Bits](https://reactbits.dev) | MIT + Commons Clause |

## License

© 2026 Nithin Gandrathi. The code is shared for viewing and reference. The content, copy, screenshots and resume are mine and may not be reused.

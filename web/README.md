# Wimco · startsida

Source of the start page of **wimco.se**. Next.js 15 (App Router), React 19, TypeScript, CSS Modules on shared design tokens. No UI or animation libraries.

```bash
npm install
npm run dev        # http://localhost:3000
npm run publish    # build and publish into ../public (see below)
npm run typecheck
```

## How it fits into wimco.se

This folder is the source of the start page only. The rest of the site (sub-pages, `functions/`, `lib/`) lives in the repo root and is untouched.

```bash
npm install
npm run dev        # UI only, http://localhost:3000 (no API, site.js calls are no-ops)
npm run publish    # next build + scripts/publish.mjs → ../public/index.html, ../public/_next/, CSP block in ../public/_headers
```

For a full test with the real API, run `npm run dev` in the repo root after publishing (http://localhost:8788).

- **Wimco Score:** `components/interactive/AnalysisForm.tsx` posts to `/api/analyze` and renders the NDJSON stream (`accepted` → `step` → `result`/`error`). It stores the owner token as `wimco-owner-<id>`, links to `/r/<id>`, and supports `/?url=…&prev=…` from reminder e-mails.
- **Project form:** `components/interactive/ProjectForm.tsx` posts `{ kind: 'project', service, name, email, company, budget, message, startedAt, company_site, turnstileToken }` to `/api/lead`. Server field errors are shown on the fields. If the API can't take the request, the visitor gets a pre-filled e-mail link.
- **Consent, analytics and Turnstile:** `lib/site.ts` imports `/assets/js/site.js` (loaded once in `app/layout.tsx`). `ConsentBanner` is markup only; `site.js` drives it.
- **CSP:** fonts are self-hosted via `@fontsource-variable/*`. Inline scripts and style attributes are allowed by hash, generated on publish.

## Structure

```
app/
  layout.tsx            metadata, viewport, self-hosted fonts, `js` class, site.js
  page.tsx              composes the sections and passes them their content
  globals.css           design tokens (light + dark), base, type scale, Reveal/entrance CSS
content/
  types.ts              the content model
  site.ts               every string on the page: edit copy here
lib/
  css.ts                vars(), cx(), format(), NAV_HEIGHT
  lines.ts              line order and colour tokens
  site.ts               bridge to /assets/js/site.js (track, Turnstile, report owner token)
scripts/
  publish.mjs           copies the export into ../public and writes the CSP block
  motion/               animation primitives (see below)
components/
  ui/                   Button, LineBadge, Eyebrow, Reveal, SectionHeading
  nav/                  SiteNav (sliding active pill, progress line, mobile menu)
  sections/             Hero, Manifesto, Facts, Services, Compare, Score, Process, Faq, Contact, Footer
  interactive/          LineMap, CompareSlider + Shots, EnterScale, SpotlightCard, UrlForm, ProjectForm, CopyButton
  visuals/              SiteMock, PortalMock, FlowMock, RingsMock, StepVisual (registry)
```

Sections are layout and composition. Interaction components own one behaviour each. Content never lives in a component: copy, labels, aria strings and example data come from `content/site.ts`. Templates use `{placeholders}` (formatted with `format()`), because content crosses from server to client components and must stay serialisable.

## Motion primitives (`lib/motion`)

| Primitive | What it does |
| --- | --- |
| `Spring` / `useSpring` | Apple-style spring (`response`, `damping`). Retargets from the live value, keeps velocity, accepts a hand-off velocity. Jumps to the target under reduced motion. |
| `useScrollFrame(read, write, enabled)` | Registers with one shared rAF loop. All reads run before all writes each frame, so scroll effects never thrash layout. |
| `setStyle` / `clearStyle` / `setFlag` | Imperative writes that skip unchanged values. Scroll-driven values never go through React state. |
| `pinProgress`, `enterProgress` | 0–1 progress for sticky sections and for elements arriving in the viewport. |
| `rubberband`, `projectMomentum`, `nearest` | Gesture maths: soft edges and flick projection (Apple's decay formula). |
| `useMediaQuery`, `useReducedMotion`, `QUERIES` | Capability queries: pinned layout, fine pointer, reduced motion. |
| `useInViewOnce`, `useActiveSection` | IntersectionObserver helpers. |
| `<Reveal>` | `heading`: the eyebrow segment draws and the title settles. `stagger`: children settle in order by `--i`. Transform only, so content is never hidden. |
| `<EnterScale>` | A surface settles from 0.94 to 1 as it arrives (section transition). |

Rules the code follows:

- Only `transform` and `opacity` animate. Exceptions: `clip-path` on the comparison, and `width` on the 32px nav pill.
- Easing comes from tokens: `--ease-out` for entering and exiting, `--ease-in-out` for movement on screen. `ease-in` is never used.
- Anything interruptible uses transitions or springs, never keyframes. Keyframes are used only for the one-time load sequence.
- Hover styles sit behind `(hover: hover) and (pointer: fine)`. Press feedback is `:active` scale, 0.96–0.98.
- Keyboard input never animates. The slider's arrow keys move it instantly.

## Interaction map

| Where | Behaviour | Phone behaviour |
| --- | --- | --- |
| Hero | Pointing at a line on the map highlights the matching word in the headline, and the reverse. Map layers drift with the pointer for depth. On scroll the copy lifts away and the map moves toward its station. | Tap a line or word to toggle the highlight. Not pinned. |
| Manifesto | Pinned sentence; each word darkens as it is reached, and the service words take their line colour. | Same, with a shorter scroll distance. |
| Services | Pinned stage. Scroll position picks the line; state changes are time-based transitions. The step bar fills with progress, and the last line scrubs the Lighthouse scores. The stepper buttons scroll to a line. | Native scroll-snap carousel with H/W/A/O buttons. A visual plays when its card is centred. |
| Före/efter | Drag with grab offset, rubber-banded edges, flick projection to snap points with velocity hand-off. A one-time nudge shows the handle can be dragged. Keyboard: arrows, Shift+arrows, Home, End. | `touch-action: pan-y`, so vertical scrolling stays with the page. Horizontal drags after an 8px threshold. Tap glides the handle there. |
| Score | The weighting bar draws in; hover, focus or tap a station to isolate its share. | Tap to toggle. |
| FAQ | Native `<details>`, one open at a time; height animates where `::details-content` is supported, plus turns to minus. | Same. |
| Contact | A spotlight in the card's line colour follows the pointer. Inline validation: the first invalid field takes focus and shakes once, with the error next to it. The copy button label crossfades to "Kopierad". | No spotlight. 16px inputs, so iOS doesn't zoom. 44px touch targets. |

## Accessibility

- Skip link, landmarks and a labelled nav.
- `aria-current` on the active nav link, stepper step and carousel button.
- The map badges are focusable buttons with `aria-pressed`.
- The comparison is a `role="slider"` with value text.
- Form messages are in a polite live region.
- Every visible focus state uses a single `:focus-visible` ring.
- `prefers-reduced-motion`: springs jump, entrances become fades, scroll scrubs and reveals stop moving, and the shake is skipped. Colour and progress feedback stay.
- `prefers-reduced-transparency`: the nav becomes solid.

## Adding things

- **New copy or language:** edit `content/site.ts`.
- **New line visual:** add a key to `VisualKind` in `content/types.ts`, build the component in `components/visuals/`, and register it in `StepVisual.tsx`. Give its root `data-active` styles in `Visuals.module.css`.
- **New scroll effect:** use `useScrollFrame` with a read (rect) and a write (`setStyle`), and pass `!reduce` as `enabled` when the effect is movement.

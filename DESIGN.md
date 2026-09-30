---
name: Wimco
description: A cold platform-white and signage-navy line network where analysis is a line, findings are stations and services are the lines you change to.
colors:
  paper: "#F3F5F4"
  paper-2: "#E7ECEA"
  white: "#FFFFFF"
  ink: "#0B1B33"
  ink-2: "#33425A"
  ink-3: "#56647A"
  rule: "rgba(11, 27, 51, 0.14)"
  rule-strong: "rgba(11, 27, 51, 0.28)"
  navy: "#0B1B33"
  navy-2: "#142A4B"
  on-navy: "#F3F5F4"
  on-navy-2: "#AAB8CC"
  signal: "#FF5A1F"
  signal-hover: "#FF7440"
  signal-ink: "#B83A0B"
  line-h: "#1F5FD1"
  line-w: "#0A7A55"
  line-a: "#F5B700"
  pass: "#0E8F62"
  pass-ink: "#0A7550"
  warn: "#F0A202"
  warn-ink: "#875700"
  fail: "#E0342A"
  fail-ink: "#B42318"
typography:
  display:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 7.1vw, 6rem)"
    fontWeight: 820
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 116"
  headline-xl:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.6vw, 3.9rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 114"
  headline:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1.85rem, 3.6vw, 3rem)"
    fontWeight: 790
    lineHeight: 1.08
    letterSpacing: "-0.028em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 2vw, 1.65rem)"
    fontWeight: 740
    lineHeight: 1.08
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 108"
  lead:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(1.12rem, 1.55vw, 1.35rem)"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 102"
  body:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    fontVariation: "'wdth' 102"
  label:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "'wdth' 106"
  numeral:
    fontFamily: "Archivo, Archivo Fallback, system-ui, sans-serif"
    fontSize: "clamp(5rem, 13vw, 10rem)"
    fontWeight: 850
    lineHeight: 0.82
    letterSpacing: "-0.045em"
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 112"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.86rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum'"
rounded:
  s: "6px"
  m: "12px"
  l: "18px"
  pill: "999px"
spacing:
  track: "8px"
  gutter: "clamp(16px, 4.2vw, 56px)"
  section: "clamp(72px, 10vw, 150px)"
components:
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.navy}"
    rounded: "{rounded.m}"
    padding: "0 22px"
    height: "50px"
    typography: "{typography.label}"
  button-signal-hover:
    backgroundColor: "{colors.signal-hover}"
    textColor: "{colors.navy}"
  button-ink:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.m}"
    padding: "0 22px"
    height: "50px"
  button-ink-hover:
    backgroundColor: "{colors.navy-2}"
    textColor: "{colors.on-navy}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.m}"
    padding: "0 22px"
    height: "50px"
  button-line-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
  button-sm:
    padding: "0 16px"
    height: "44px"
  scan-bar:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.l}"
    padding: "8px"
    height: "76px"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "12px 14px"
    height: "50px"
  badge-h:
    backgroundColor: "{colors.line-h}"
    textColor: "{colors.white}"
    rounded: "{rounded.s}"
    size: "1.7em"
  badge-w:
    backgroundColor: "{colors.line-w}"
    textColor: "{colors.white}"
    rounded: "{rounded.s}"
    size: "1.7em"
  badge-a:
    backgroundColor: "{colors.line-a}"
    textColor: "{colors.navy}"
    rounded: "{rounded.s}"
    size: "1.7em"
  badge-o:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.navy}"
    rounded: "{rounded.s}"
    size: "1.7em"
  status-tag:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  switch-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "0 20px 0 12px"
    height: "56px"
  switch-tab-selected:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
  panel-white:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.l}"
    padding: "clamp(28px, 4vw, 56px)"
  panel-navy:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.l}"
    padding: "clamp(24px, 3.5vw, 44px)"
---

# Design System: Wimco

## Overview

**Creative North Star: "The Line Network"**

Wimco is drawn as a transit system. The free analysis is a trunk line whose stations light up as real measurement steps complete; every problem station is an interchange where the visitor can change to a service line: Hemsidor (H), Webbutveckling (W), Automation (A) and Optimering/Analys (O). The grammar is platform signage and a metro map: cold platform-white ground, signage-navy slabs, 8px coloured tracks, ringed station dots, square letter badges and a wide, heavy grotesque that reads like a sign across a platform.

The surface is calm and dense rather than decorative. Colour does not decorate; it names. Each hue is a line with one meaning, and orange is the analysis line and the action colour at once. Depth comes from navy slabs placed on paper and from white panels, not from stacked shadows. Motion is mechanical and purposeful: a train that travels, a progress fill that grows along the track, a station ring that pings while it is being measured.

The same world runs from the home page through the report page, the guides and the generated Open Graph images (navy ground, orange track, paper and soft-navy labels, Archivo), so a shared report link looks like a sign from the same network.

**Key Characteristics:**
- Transit-map grammar: tracks (8px), ringed stations (6px navy ring), interchanges, letter badges.
- Four named line colours, each bound to one service; orange doubles as the single action colour.
- Archivo variable, pushed wide (104–118% width) and heavy (620–850) for signage; JetBrains Mono for measured values.
- Paper, white and navy surfaces alternate section by section; navy slabs carry the most important inputs.
- Status is always colour plus shape plus text, never colour alone.

## Colors

A cold, near-neutral platform white against deep signage navy, with four saturated line colours and a separate, darker set of text-safe "ink" variants for state.

### Primary
- **Signal Orange** (signal): the Analysis/Optimering line and the only action colour. Fills the primary CTA, the analysis track and its progress fill, lit station dots, the logo's full stop, focus rings, selection and underline accents. Always carries navy text when it is a fill.
- **Signal Orange, lifted** (signal-hover): hover state of orange fills only.
- **Signal Orange, ink** (signal-ink): orange at text contrast, used for list markers in prose.

### Secondary
- **Line Blue** (line-h): the Hemsidor line. H badges, the H branch, the H panel rail, and the "measured" source chip.
- **Line Green** (line-w): the Webbutveckling line. W badges, the W branch and panel rail. Darker than a signal green so white badge letters stay legible.
- **Line Yellow** (line-a): the Automation line. A badges (navy letter), the automation flow track, timestamps on navy, and the automation-section CTA on navy.

### Tertiary
- **Pass / Warn / Fail** (pass, warn, fail): state fills for station dots, category dots, status marks, error rings and dashed AI-assessment borders.
- **Pass / Warn / Fail ink** (pass-ink, warn-ink, fail-ink): the same states at text contrast for messages, labels and source chips.

### Neutral
- **Platform White** (paper): page ground, station-dot core, panels set inside white sections. Also the text colour on navy (on-navy).
- **Worn Platform** (paper-2): hover fill on station stops, inline code, image placeholders, scrollbar track.
- **White** (white): raised reading panels (switch panel, scan result, report bodies, form fields) and alternate section grounds (Score, process, FAQ).
- **Signage Navy** (navy / ink): primary text, station rings, the scan bar, facts band, automation section, footer, scoreboard, action panel, mobile nav sheet, selected tabs.
- **Navy, raised** (navy-2): hover of navy buttons, inputs set inside navy panels, screenshot frame.
- **Ink 2 / Ink 3** (ink-2, ink-3): secondary copy (leads, panel paragraphs) and tertiary metadata (captions, counts, optional labels).
- **Soft Navy** (on-navy-2): secondary text on navy grounds.
- **Rules** (rule, rule-strong): hairlines between list rows and neutral borders on fields, chips and tabs.

### Named Rules
**The One Line, One Meaning Rule.** H is blue, W is green, A is yellow, O is orange, everywhere: badges, branches, panel rails, guide asides and form chips. A line colour never appears as decoration detached from its service.

**The Navy On Signal Rule.** Every orange or yellow fill carries navy text or a navy glyph; white text sits only on blue and green badges and on navy.

**The Shape Carries State Rule.** Pass, warn and fail each have a distinct mark (ring with tick, half-filled ring, filled disc with bar) and a text label; colour alone never reports a result.

## Typography

**Display Font:** Archivo variable, self-hosted and subset (weights 400–850, width 100–125%), with a metric-adjusted Arial fallback ("Archivo Fallback") and system-ui.
**Body Font:** Archivo, same file, at 102% width.
**Label/Mono Font:** JetBrains Mono variable (400–700), tabular numerals.

**Character:** One grotesque stretched wide and set heavy for headings reads like platform signage; in running text it relaxes to near-normal width. Mono appears as the instrument voice: weights, scores-out-of, timestamps, counts, finding values.

### Hierarchy
- **Display** (820, clamp 2.6–6rem, 0.95, width 116%, -0.035em, max 13.5ch): page headlines. The home hero uses the same style at clamp(2.5rem, 4.9vw, 4.8rem) with 24ch so the headline spans about two thirds; subpage heads use clamp(2.3rem, 5.6vw, 4.6rem), 18ch.
- **Headline XL** (800, clamp 2–3.9rem, 1.02, width 114%): statement headlines (the H/W/A builds statement, the closing "Var står du i dag?").
- **Headline** (790, clamp 1.85–3rem, width 112%): section titles.
- **Title** (740, clamp 1.3–1.65rem, width 108%): panel and card titles, founder note. Smaller list titles (1.2–1.3rem, 740–760) follow the same weight/width pairing.
- **Lead** (400, clamp 1.12–1.35rem, 1.5, ink-2, 54ch): hero and page intros; section leads run a step smaller (1.05–1.2rem, 60ch).
- **Body** (400, 1.0625rem, 1.55): all running copy; prose pages use 1.1rem / 1.7 at 70ch. Paragraph measure is held at 52–64ch.
- **Label** (620–720, 0.95–1.1rem, width 104–108%): nav links, button labels (700, 108%), form labels, station names, tab labels.
- **Numeral** (840–850, width 112%, -0.04 to -0.045em, tabular): the score. 10rem max on the scoreboard, 8rem in the inline result, 4rem per category.
- **Mono** (400–700, 0.78–1.3rem, tabular): station notes, weights ("20 %"), "/ 100", timestamps, counts, category scores, share URL.

### Named Rules
**The Signage Width Rule.** The heavier and larger the text, the wider it is set: body 102%, labels 104–108%, titles 108–112%, display 114–118%. Headings are always balanced (text-wrap: balance) and tightly tracked.

**The Instrument Voice Rule.** JetBrains Mono is reserved for numbers and machine-like values; never set headings or paragraph copy in it.

## Layout

A single 1320px container (`wrap`) with a fluid gutter (16–56px) holds everything; sections breathe on a fluid block rhythm of 72–150px and alternate grounds (paper, white, navy) instead of using dividers. Section heads are a narrow grid (max 760px, 18px gap) above the content.

Structure is asymmetric two-column grids with fractional weights (1.9fr/1fr hero, 1.4fr/1fr process, 0.8fr/1.5fr FAQ, 1fr/1.25fr closing choice, 1.15fr/1fr alternating work rows), plus horizontal line layouts: the 5-station analysis line with an interchange column (210–250px), 6-stop Score line, 6-stop category line on the report, 4-stop automation flow and 4-stop value line.

Responsive behaviour is line-first: at 860–900px every horizontal line turns vertical (track runs down the left, stations stack), the nav collapses to a navy sheet at 900px, two-column grids stack at 800–960px, and the 6-stop lines become horizontally scrollable snap strips with a fade mask. At 640px the scan bar stacks field over button. Touch targets are at least 44px throughout.

**The Line Turns Rule.** A line never wraps into rows; on narrow screens it rotates to vertical or scrolls along its own axis.

## Elevation & Depth

Mostly flat. Depth is conveyed by placing navy slabs and white panels on the paper ground and by 2px navy borders. One soft, navy-tinted two-layer shadow exists and is used only on elements that float or must be found first: the scan bar, the mobile nav sheet, the consent card and the studio screenshot.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 1px 2px rgba(11, 27, 51, 0.06), 0 12px 32px -12px rgba(11, 27, 51, 0.22)`): scan bar, mobile nav sheet, consent card, screenshot frame.
- **Signal focus halo** (`box-shadow: 0 0 0 4px rgba(255, 90, 31, 0.35)`): focus-within on the scan bar; fields use the same halo at 0.3.
- **Error ring** (`box-shadow: 0 0 0 3px #E0342A`): invalid scan bar, layered over Float.

**The Slab Not Shadow Rule.** Emphasis comes from a navy slab or a 2px navy border, not from a heavier shadow; there is only one shadow and it signals "floating".

## Shapes

Gently rounded rectangles against perfect circles. Controls and inner panels use 12px, large panels and slabs 18px, badges 6px, status tags and source chips are full pills. Stations are circles with a 6px navy ring on a paper or white core (26–38px). Tracks are 8px with fully rounded ends; service-panel rails are 10px. Borders are 2px navy for emphasis, 1.5–2px rule-strong for neutral controls, 1px rule for list separators. The single decorative stripe is the 45° warning hatch on the development-data banner.

**The Ring And Track Rule.** Any sequence (analysis steps, process, route lists, value chain, automation flow, "what you get") is drawn as an 8px track threaded through ringed stations, not as numbered cards.

## Components

### Buttons
Sturdy signage keys: wide, bold, square-ish.
- **Shape:** gently rounded (12px), min-height 50px (44px small, 60px in the scan bar), 22px side padding, 2px border slot.
- **Signal (primary):** orange fill, navy label. Used for "Analysera min webbplats" and analysis entry points only.
- **Ink:** navy fill, platform-white label; the project/enquiry action. Inside the navy automation section it switches to the yellow A fill with navy text.
- **Line:** transparent with 2px navy border; hover fills navy. Used for secondary routes and in the header ("Starta ett projekt"), where the mobile sheet turns it orange.
- **Ghost on navy:** transparent with a half-opacity paper border.
- **Hover / Focus / Active:** colour shifts on hover (pointer devices only), 3px orange outline at 3px offset on focus, scale(0.97) on press, spinner and progress cursor while busy.

### Chips
- **Status tag:** navy pill with an orange dot before the label. On the line map it states the mode: "Exempel" (navy), live (orange with blinking navy dot), done (pass green with white dot).
- **Source chip:** outlined pill in the colour of its source (measured blue, rules ink-2, heuristic warn-ink, AI pass-ink), 0.76rem bold.
- **Choice chip (form):** 12px-rounded, 2px rule-strong border, service badge inside; checked gets a navy border and inset ring on paper.

### Cards / Containers
- **Corner Style:** 18px panels, 12px inner panels and notices.
- **Background:** white panels on paper or paper panels on white; navy slabs for scoreboard, action panel, closing analysis path, callouts.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 2px navy on the scan result and project form; 2px rule on notices, switching to fail or warn by state.
- **Internal Padding:** fluid, roughly 22–56px.

### Inputs / Fields
- **Style:** white, 1.5px rule-strong border, 12px radius, 50px min height; on navy they are navy-2 with a translucent paper border.
- **Focus:** navy border plus orange halo; no default outline.
- **Error / Disabled:** fail border and fail-ink message beneath; disabled buttons at 55% opacity.

### Navigation
- Logo "Wimco." in display weight at 118% width with an orange full stop. Links in label weight, ink-2, with an orange 2px underline that draws in from the left on hover and stays on the current page. Below 900px a bordered "Meny" toggle (bars morph to a cross) opens a navy sheet with 52px rows and an orange CTA.

### Line Map (signature)
The hero figure: a 5-station trunk (8px track) ending in a navy double interchange ring from which four service lines branch at 45° (O up, H straight on, W and A down). After a real analysis each station takes a verdict shape (full green pass, half-filled amber, red with a white bar) and the lines of the recommended services stay lit with "Byt här" while the others dim (labels stay at ink-3 for contrast). In demo mode a navy train with orange windows runs example findings; in live mode the track greys, an orange fill grows with real progress, the active station rings orange and pings, done stations fill orange, limited ones ring warn, failures ring fail. The same line becomes the progress indicator for the real analysis.

### Service Switch (signature)
Tabs carrying line badges; the selected tab becomes a navy slab. The panel below is white with a 10px rail in the selected line's colour along its top edge and a route list of ringed stops on a track of the same colour.

### Findings and Disclosures
FAQ items and report findings are rows on hairlines under a 2–3px navy top rule. Summaries are bold labels with a circular plus that rotates 45° and fills orange when open (FAQ) or a chevron (findings), with mono values right-aligned.

## Do's and Don'ts

### Do:
- **Do** bind every colour to its line: H blue (#1F5FD1), W green (#0A7A55), A yellow (#F5B700), O/analysis orange (#FF5A1F).
- **Do** draw sequences as an 8px track through 6px-ringed station circles, and turn the line vertical below about 860px.
- **Do** put navy text on orange and yellow fills.
- **Do** set headings in Archivo at 108–118% width and 740–850 weight; keep body at 102% width and 52–70ch.
- **Do** use JetBrains Mono with tabular numerals for scores, weights, counts and timestamps.
- **Do** pair every state colour with a shape and a text label, and keep touch targets at 44px or more.
- **Do** give every animation a reduced-motion equivalent (the train fades instead of travelling, progress jumps, pings hold still).

### Don't:
- **Don't** use orange as a general accent: it means analysis or the primary action.
- **Don't** introduce a second shadow or lift panels with heavier shadows; use a navy slab or border.
- **Don't** lay out services or steps as a grid of equal cards; they are lines and stations.
- **Don't** show development or sample data unmarked: sample runs carry the "Exempel" status tag and development data the hatched warning banner.

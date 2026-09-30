# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the owner's written brief (2026-09-30) and the live wimco.se / repository. The owner asked for no clarifying questions, so the interview round was substituted by the brief. Facts marked *(inferred)* are unconfirmed.

## Platform

web

## Stack

Static HTML/CSS/vanilla JS (incumbent, kept for speed and simple hosting). Server logic runs as Cloudflare Pages Functions with a KV namespace *(inferred: live site sits behind Cloudflare; no other host config in repo)*. A Node dev server mirrors the functions locally.

## Users

- Owners and marketing leads at small and medium Swedish companies who already have a website and suspect it underperforms. Job: find out what is wrong, in plain Swedish, without signing up.
- Companies that need a new website, a custom web application, or an automation of manual work. Job: judge whether Wimco can build it and start a conversation.

## Product Purpose

Wimco is a one-person-led digital studio (founder: Willem) that designs and builds websites, advanced web solutions, digital tools/web applications and AI/business automations, and optimises existing sites. The free Wimco Score analysis is the interactive way in: it proves competence, attracts traffic and turns visitors into qualified leads for those services. Success = qualified project enquiries and booked calls.

## Positioning

"Wimco analyserar vad som håller din digitala närvaro tillbaka – och kan sedan designa, utveckla och automatisera lösningen." The same studio that diagnoses the site builds the fix; diagnosis and delivery share one language.

## Operating Context

- Swedish-language site, Swedish audience.
- First call is a free 20-minute conversation. A simpler update can take about a week; a new website usually 3–6 weeks (from existing FAQ).
- Process: kostnadsfritt samtal → förslag & prioritering → genomförande → uppföljning.

## Capabilities and Constraints

- Analysis must use real signals (Lighthouse/PageSpeed Insights, fetched HTML) and label sources: measured, rule-based, AI-assessed.
- Development data must never be shown as a real analysis.
- URL analysis must be SSRF-safe and rate limited.
- Private reports are never indexable without explicit opt-in.
- GDPR: analytics only after consent; email only with explicit purpose.

## Brand Commitments

- Name: Wimco (logo written "Wimco." with a dot).
- Voice: rak, personlig, ingen teknisk jargong, inga byråfloskler. Speaks as "vi"/"jag (Willem)".
- Wants to feel: skarp, intelligent, visuellt progressiv, personlig, tekniskt kompetent, affärsorienterad, premium.
- Must not feel like a traditional ad agency, a generic freelance portfolio or an automated SEO tool.

## Evidence on Hand

- Contact: hej@wimco.se, +46 72 218 05 09 (footer of live site).
- Founder intro text ("Hej, jag är Willem!").
- Guide: `blogg/hur-mycket-kostar-en-hemsida.html`.
- Own experiment: `playground/` – interactive typography & motion study.
- GA4 property G-B7VWYC02LZ.
- ABSENT, must not be fabricated: client cases, client logos, testimonials (the two on the old site were placeholders), statistics/results, partners, org.nr (placeholder on old site), pricing beyond the guide's market ranges.

## Product Principles

1. Give real value before asking for anything.
2. Every finding points to a concrete fix – and to the Wimco service that delivers it.
3. Transparency over impressiveness: show how every number was produced.
4. One studio, one language: tool and services are the same story.

## Accessibility & Inclusion

WCAG 2.1 AA, full keyboard use, reduced-motion parity, 44px touch targets.

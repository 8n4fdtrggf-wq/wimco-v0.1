/**
 * Content model. Everything a writer may change lives in content/site.ts and is typed here.
 * Components read these shapes and never hard-code copy. Values must stay serializable
 * (no functions), because they cross from server components into client components.
 * Strings with {placeholders} are formatted in the component that uses them.
 */

/** The four things Wimco builds. `service` keys match the lead API (lib/analysis/catalog.js). */
export type ServiceKey = 'hemsidor' | 'webbutveckling' | 'automation' | 'optimering';

export interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface MetaContent {
  siteUrl: string;
  siteName: string;
  locale: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  sameAs: string[];
  themeColor: string;
}

export interface NavContent {
  skip: string;
  homeLabel: string;
  /** Logo label on pages other than the start page. */
  homePageLabel: string;
  label: string;
  /** `id` marks an on-page section (gets the active state); links without it go to other pages.
   *  `page` marks the link to the page being shown, on pages other than the start page. */
  links: (LinkItem & { id?: string; page?: string })[];
  cta: LinkItem;
  menu: { open: string; close: string };
  /** The score dock in the bar. "{score}" is replaced. */
  dock: { label: string; example: string; handover: string; handoverLabel: string };
}

/** One of the six Wimco Score categories, with the example company's finding and fix. */
export interface Station {
  name: string;
  weight: number;
  source: string;
  measures: string;
  before: number;
  after: number;
  finding: string;
  fix: string;
  service: ServiceKey;
}

export interface HeroContent {
  title: string;
  lede: string;
  /** A second way in for visitors who already know they want something built. */
  secondary: { text: string; link: LinkItem };
  proof: string[];
  example: {
    host: string;
    tag: string;
    ringLabel: string;
    caption: string;
    log: string[];
    running: string;
    done: string;
    chips: string[];
    siteHeadline: string;
  };
}

export interface StationsContent {
  title: string;
  lede: string;
  sourcesNote: string;
  link: LinkItem;
}

/** One reference: a site Wimco built. Add a new object to `work.items` in content/site.ts. */
export interface WorkItem {
  /** Short, URL-safe key, e.g. "voccleaning". */
  id: string;
  name: string;
  /** What the client does, in a few words. */
  about: string;
  /** Shown in the address bar on the laptop screen. */
  host: string;
  /** Leave out until the site is live; the "visit" link is shown only when set. */
  href?: string;
  /** A case page on wimco.se, e.g. "/referenser/voccleaning/". Shown as "Läs caset". */
  caseHref?: string;
  /** What Wimco did. */
  did: string[];
  /** A tall screenshot in public/assets/img/referenser/: 16:10 or longer for a site, 390:844 or longer for an app. */
  image: { src: string; width: number; height: number };
  /** What the screenshot sits in: a browser window (default, shows `host`) or a phone (for apps). */
  frame?: 'browser' | 'phone';
  /** The small live cards around the screenshot. Four show at a time; up to eight rotate in on each shuffle. */
  orbit: OrbitCard[];
}

/**
 * One floating card around a reference. Each kind is a tiny UI that plays on a loop and shows
 * one thing Wimco did for the client. Copy only; the motion lives in components/work/OrbitCards.tsx.
 */
export type OrbitCard =
  | { kind: 'checklist'; title: string; items: string[] }
  | { kind: 'search'; title: string; query: string; resultTitle: string; resultUrl: string; resultText: string }
  | { kind: 'ai'; title: string; question: string; answer: string; source: string }
  | { kind: 'form'; title: string; fields: string[]; submit: string; toast: string }
  | { kind: 'switches'; title: string; items: string[] }
  | { kind: 'tabs'; title: string; tabs: { label: string; text: string }[] }
  | { kind: 'load'; title: string; label: string; done: string }
  | { kind: 'device'; title: string; options: [string, string] }
  | { kind: 'push'; title: string; app: string; items: string[] }
  | { kind: 'signature'; title: string; name: string; done: string };

/** "Referenser": real sites on a laptop screen, and the list to switch between them. */
export interface WorkContent {
  title: string;
  lede?: string;
  listLabel: string;
  didLabel: string;
  visit: string;
  /** Link text for caseHref. */
  readCase: string;
  /** "{name}" is replaced. */
  screenLabel: string;
  /** Label of the floating cards around the screenshot. "{name}" is replaced. */
  orbitLabel: string;
  next: { title: string; body: string; cta: LinkItem };
  items: WorkItem[];
}

export interface BuildContent {
  title: string;
  lede: string;
  head: { name: string; what: string; time: string };
  items: { service: ServiceKey; name: string; what: string; examples: string[]; time: string }[];
  cta: LinkItem;
}

/** The company section: who Wimco is and how to reach it. */
export interface CompanyContent {
  initial: string;
  title: string;
  body: string;
  email: string;
  phone: string;
  /** E.164, for the tel: link. */
  phoneHref: string;
  /** Further numbers shown under the first, each with its own copy button. */
  morePhones: { phone: string; phoneHref: string }[];
  copy: string;
  copied: string;
  copyEmailLabel: string;
  copyPhoneLabel: string;
}

/** The E-handelskollen section on the start page. */
export interface KollenTeaserContent {
  tag: string;
  title: string;
  lede: string;
  href: string;
  inputLabel: string;
  placeholder: string;
  submit: string;
  note: string;
  more: string;
  boardTitle: string;
  boardSince: string;
  price: string;
}

export interface ProcessContent {
  title: string;
  steps: { title: string; body: string }[];
}

export interface FaqContent {
  title: string;
  items: { question: string; answer: string; link?: LinkItem }[];
}

export interface AnalyseContent {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  inputLabel: string;
  placeholder: string;
  submit: string;
  cancel: string;
  /** Inline validation, before anything is sent. */
  error: string;
  preparing: string;
  /** "{host}" is replaced. */
  running: string;
  stepRunning: string;
  stepCached: string;
  cancelled: string;
  networkError: string;
  streamError: string;
  unexpectedEnd: string;
  resultLabel: string;
  /** "{prev}", "{now}" and "{diff}" are replaced. */
  previous: string;
  compareHint: string;
  openReport: string;
  again: string;
  gets: string[];
}

export interface ProjectContent {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  typeLegend: string;
  /** `service` is the key the lead API expects (lib/analysis/catalog.js in the repo root). */
  types: { label: string; service: ServiceKey }[];
  fields: { name: string; email: string; company: string; budget: string; message: string; honeypot: string };
  budgets: string[];
  privacy: { text: string; link: LinkItem };
  /** Shown under the form intro; `{phone}` becomes a tel: link. */
  call: string;
  submit: string;
  sending: string;
  successTitle: string;
  /** "{email}" is replaced with the visitor's address. */
  successBody: string;
  /** Shown when the lead API cannot take the request; "{email}" is the contact address. */
  failure: string;
  mailLink: string;
  mailSubject: string;
  errors: { name: string; email: string; message: string };
}

export interface ContactContent {
  title: string;
  lede: string;
  analyse: AnalyseContent;
  project: ProjectContent;
  company: CompanyContent;
}

export interface FooterContent {
  tagline: string;
  columns: { title: string; links: LinkItem[] }[];
  /** Reopens the consent banner (handled by /assets/js/site.js). */
  consentLabel: string;
  legal: string;
}

export interface ConsentContent {
  text: string;
  link: LinkItem;
  deny: string;
  allow: string;
}

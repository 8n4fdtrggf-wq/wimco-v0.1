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

export interface RepairContent {
  pause: string;
  title: string;
  lede: string;
  note: string;
  ringLabel: string;
  serviceLabel: string;
  findingLabel: string;
  fixLabel: string;
  site: {
    host: string;
    tabBefore: string;
    tabAfter: string;
    company: string;
    navBefore: string[];
    navAfter: string[];
    headlineBefore: string;
    headlineAfter: string;
    bodyBefore: string;
    bodyAfter: string;
    imageWeight: string;
    cookie: string;
    cookieButton: string;
    cta: string;
    toast: string;
  };
}

export interface AutomationContent {
  title: string;
  lede: string;
  run: string;
  rerun: string;
  demoNote: string;
  form: { name: string; message: string; service: string };
  steps: { title: string; body: string }[];
  surface: {
    formTitle: string;
    crmHead: string[];
    crmStatus: string;
    replySubject: string;
    replyBody: string;
    summary: string;
  };
  more: { title: string; items: string[] };
}

export interface BuildContent {
  title: string;
  lede: string;
  head: { name: string; what: string; time: string };
  items: { service: ServiceKey; name: string; what: string; examples: string[]; time: string }[];
  cta: LinkItem;
}

/** "Din sajt. Du bestämmer." The editor you can try, and what Wimco promises. */
export interface OwnershipContent {
  title: string;
  lede: string;
  editor: {
    label: string;
    hint: string;
    demoNote: string;
    host: string;
    company: string;
    nav: string[];
    headline: string;
    /** Played once when the section arrives, unless the visitor got there first. */
    demoHeadline: string;
    body: string;
    price: string;
    priceLabel: string;
    images: { label: string; kind: 'tiles' | 'kitchen' | 'wood' }[];
    swapImage: string;
    fieldLabels: { headline: string; body: string; price: string };
    change: string;
    changes: string;
    noChanges: string;
    publish: string;
    publishing: string;
    /** "{time}" is replaced with the visitor's clock. */
    published: string;
    publishedSub: string;
    undo: string;
  };
  promisesTitle: string;
  usualLabel: string;
  promises: { title: string; usual: string; body: string }[];
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

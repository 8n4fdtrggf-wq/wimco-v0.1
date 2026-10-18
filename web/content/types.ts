/**
 * Content model. Everything a writer may change lives in content/site.ts and is typed here.
 * Components read these shapes and never hard-code copy. Values must stay serializable
 * (no functions), because they cross from server components into client components.
 * Strings with {placeholders} are formatted in the component that uses them.
 */

export type LineId = 'h' | 'w' | 'a' | 'o';
export type Tone = 'poor' | 'avg' | 'good';

export interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
}

/** A run of text; when `line` is set the run belongs to that transit line and can be emphasised. */
export interface Segment {
  text: string;
  line?: LineId;
}

export interface LineInfo {
  letter: string;
  name: string;
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
  themeLight: string;
  themeDark: string;
}

export interface NavContent {
  skip: string;
  homeLabel: string;
  label: string;
  /** `id` marks an on-page section (gets the active pill); links without it go to other pages. */
  links: (LinkItem & { id?: string; line: LineId })[];
  cta: LinkItem;
  menu: { open: string; close: string };
}

export interface HeroContent {
  label: string;
  eyebrow: string;
  headline: Segment[];
  lede: string;
  primary: LinkItem;
  secondary: LinkItem;
  map: {
    ariaLabel: string;
    stops: Record<LineId, string>;
    destination: string;
    destinationSub: string;
  };
  hint: { fine: string; coarse: string };
  cue: string;
}

export interface ManifestoContent {
  label: string;
  segments: Segment[];
  byline: { initial: string; text: string };
}

export interface FactsContent {
  label: string;
  items: { title: string; body: string }[];
}

export type VisualKind = 'site' | 'portal' | 'flow' | 'rings';

export interface ServiceStep {
  line: LineId;
  title: string;
  body: string;
  stops: string[];
  visual: VisualKind;
  caption: string;
}

export interface PortalRow {
  customer: string;
  matter: string;
  status: string;
  /** When set, the status resolves to this value once the visual becomes active. */
  resolvesTo?: string;
  delayMs?: number;
}

export interface FlowNode {
  time: string;
  title: string;
  body: string;
}

export interface RingItem {
  label: string;
  from: number;
  to: number;
}

export interface ServicesContent {
  label: string;
  eyebrow: string;
  title: string;
  stepperLabel: string;
  urlPrefix: string;
  lineLabel: string;
  steps: ServiceStep[];
  portal: { head: [string, string, string]; rows: PortalRow[] };
  flow: FlowNode[];
  rings: { items: RingItem[]; bands: { label: string; tone: Tone }[] };
}

export interface BeforeShotContent {
  company: string;
  welcome: string;
  body: string;
  cookie: string;
  cookieButton: string;
  score: number;
  scoreLabel: string;
}

export interface AfterShotContent {
  company: string;
  nav: string[];
  navCta: string;
  headline: string;
  sub: string;
  cta: string;
  score: number;
  scoreLabel: string;
}

export interface CompareContent {
  label: string;
  line: LineId;
  eyebrow: string;
  title: string;
  lede: string;
  slider: {
    label: string;
    /** e.g. "{before} % före, {after} % efter" */
    valueText: string;
    before: string;
    after: string;
    /** Resting points a flick can land on, as fractions of the width. */
    snaps: number[];
  };
  before: BeforeShotContent;
  after: AfterShotContent;
  metricsHead: [string, string, string];
  metrics: { label: string; before: string; after: string }[];
  note: string;
}

export interface ScoreWeight {
  name: string;
  pct: number;
  body: string;
  source: string;
  line: LineId;
  /** A lighter tint of the line colour, for the 5th and 6th stations. */
  muted?: boolean;
}

export interface ScoreContent {
  eyebrow: string;
  title: string;
  lede: string;
  stackLabel: string;
  weights: ScoreWeight[];
  primary: LinkItem;
  secondary: LinkItem;
}

export interface ProcessContent {
  eyebrow: string;
  title: string;
  steps: { label: string; title: string; body: string }[];
}

export interface FaqContent {
  eyebrow: string;
  title: string;
  items: { question: string; answer: string; link?: LinkItem }[];
}

export interface AnalyseContent {
  id: string;
  line: LineId;
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
  line: LineId;
  eyebrow: string;
  title: string;
  body: string;
  typeLegend: string;
  /** `service` is the key the lead API expects (lib/analysis/catalog.js in the repo root). */
  types: { line: LineId; label: string; service: string }[];
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

export interface WillemContent {
  initial: string;
  title: string;
  body: string;
  email: string;
  phone: string;
  /** E.164, for the tel: link. */
  phoneHref: string;
  copy: string;
  copied: string;
  copyEmailLabel: string;
  copyPhoneLabel: string;
}

export interface ContactContent {
  eyebrow: string;
  title: string;
  analyse: AnalyseContent;
  project: ProjectContent;
  willem: WillemContent;
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

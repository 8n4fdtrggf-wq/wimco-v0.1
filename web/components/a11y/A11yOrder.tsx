'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { format } from '@/lib/css';
import { shake } from '@/lib/motion';
import { track, turnstileToken } from '@/lib/site';
import type { order as OrderCopy } from '@/content/tillganglighet';
import type { A11yPackage } from '../../../lib/a11y/packages.js';
import { A11Y_EVENT, type A11yReport } from './A11yCheck';
import form from '@/components/interactive/ProjectForm.module.css';
import styles from './A11yOrder.module.css';

type Field = 'package' | 'name' | 'company' | 'email' | 'site' | 'terms';
type Errors = Partial<Record<Field, string>>;
const ORDER: Field[] = ['package', 'name', 'company', 'email', 'site', 'terms'];

// Same rules as validateLead() in lib/leads.js.
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;
const SITE = /^(https?:\/\/)?[^\s/$.?#]+\.[^\s]{2,}$/i;

interface Props {
  copy: typeof OrderCopy;
  packages: A11yPackage[];
  platforms: Record<string, string>;
  sizes: Record<string, string>;
}

/**
 * Order → POST /api/lead with kind "a11y_order". The API mails Wimco the order (with the test result
 * when there is one) and sends the customer a confirmation. Nothing is binding until Wimco's written
 * confirmation has been approved, and the form says so twice.
 * Listens for a finished check (prefills address, platform and attaches the result) and for package
 * picks from the package cards and the result's call to action.
 */
export function A11yOrder({ copy, packages, platforms, sizes }: Props) {
  const recommended = packages.find((p) => p.recommended)?.id ?? packages[0].id;
  const [pkg, setPkg] = useState(recommended);
  const [report, setReport] = useState<A11yReport | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [mailHref, setMailHref] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; mailed: boolean } | null>(null);
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    const onResult = (e: Event) => {
      const r = (e as CustomEvent<A11yReport>).detail;
      setReport(r);
      const f = formRef.current;
      if (!f) return;
      const site = f.elements.namedItem('site') as HTMLInputElement | null;
      if (site && !site.value) site.value = r.host;
      const platform = f.elements.namedItem('platform') as HTMLSelectElement | null;
      if (platform && !platform.value && r.platform && platforms[r.platform.id]) platform.value = r.platform.id;
    };
    const onPick = (e: Event) => setPkg((e as CustomEvent<string>).detail);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('[data-pick-package]') as HTMLElement | null;
      if (a?.dataset.pickPackage) {
        setPkg(a.dataset.pickPackage);
        track('a11y_package', { package: a.dataset.pickPackage });
      }
    };
    window.addEventListener(A11Y_EVENT, onResult);
    window.addEventListener('wimco:a11y-package', onPick);
    document.addEventListener('click', onClick);
    const param = new URLSearchParams(window.location.search).get('paket');
    if (param && packages.some((p) => p.id === param)) setPkg(param);
    return () => {
      window.removeEventListener(A11Y_EVENT, onResult);
      window.removeEventListener('wimco:a11y-package', onPick);
      document.removeEventListener('click', onClick);
    };
  }, [packages, platforms]);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const clear = (f: Field) => setErrors((e) => (e[f] ? { ...e, [f]: undefined } : e));

  const focusFirst = (f: HTMLFormElement, errs: Errors) => {
    const first = ORDER.find((k) => errs[k]);
    if (!first) return;
    const el = (first === 'package' ? f.querySelector('input[name="package"]:checked') ?? f.querySelector('input[name="package"]') : f.elements.namedItem(first)) as HTMLElement | null;
    el?.focus();
    shake(first === 'terms' ? el?.closest('label') : el?.parentElement);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const f = e.currentTarget;
    const data = new FormData(f);
    const v = (n: string) => String(data.get(n) ?? '').trim();
    const body = {
      kind: 'a11y_order',
      startedAt: startedAt.current,
      package: pkg,
      name: v('name'),
      company: v('company'),
      email: v('email'),
      phone: v('phone'),
      site: v('site'),
      platform: v('platform'),
      size: v('size'),
      message: v('message'),
      terms: data.get('terms') === 'on',
      a11yId: report?.id ?? '',
      company_site: v('company_site'),
      turnstileToken: null as string | null,
    };
    const next: Errors = {};
    if (!packages.some((p) => p.id === body.package)) next.package = copy.errors.package;
    if (!body.name) next.name = copy.errors.name;
    if (!body.company) next.company = copy.errors.company;
    if (!EMAIL.test(body.email)) next.email = copy.errors.email;
    if (!SITE.test(body.site)) next.site = copy.errors.site;
    if (!body.terms) next.terms = copy.errors.terms;
    setErrors(next);
    setFailure(null);
    setMailHref(null);
    if (Object.keys(next).length) {
      focusFirst(f, next);
      return;
    }

    setSending(true);
    try {
      body.turnstileToken = await turnstileToken();
      const res = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; mailed?: boolean; errors?: Errors; message?: string };
      if (res.ok && json.ok) {
        track('generate_lead', { kind: 'a11y_order', package: body.package });
        setDone({ email: body.email, mailed: !!json.mailed });
        return;
      }
      if (json.errors && Object.keys(json.errors).length) {
        setErrors(json.errors);
        focusFirst(f, json.errors);
        return;
      }
      throw new Error(json.message || `lead ${res.status}`);
    } catch {
      setFailure(format(copy.failure, { email: copy.email }));
      const name = packages.find((p) => p.id === body.package)?.name ?? body.package;
      const lines = [
        `${copy.packageLegend}: ${name}`,
        `${copy.fields.name}: ${body.name}`,
        `${copy.fields.company}: ${body.company}`,
        `${copy.fields.email}: ${body.email}`,
        `${copy.fields.site}: ${body.site}`,
      ];
      if (report) lines.push(`Testresultat: ${window.location.origin}/tillganglighet/?r=${report.id}`);
      if (body.message) lines.push('', body.message);
      setMailHref(`mailto:${copy.email}?subject=${encodeURIComponent(copy.mailSubject)}&body=${encodeURIComponent(lines.join('\n'))}`);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div ref={doneRef} className={form.done} tabIndex={-1} role="status">
        <h4>{copy.successTitle}</h4>
        <p>{format(done.mailed ? copy.successMailed : copy.successPlain, { email: done.email })}</p>
        <p>{copy.successNote}</p>
      </div>
    );
  }

  const field = (name: Field) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `o-${name}-error` : undefined,
    onInput: () => clear(name),
  });

  return (
    <form ref={formRef} className={form.form} onSubmit={onSubmit} noValidate>
      <fieldset className={form.types} aria-describedby={errors.package ? 'o-package-error' : undefined}>
        <legend className={form.legend}>{copy.packageLegend}</legend>
        <div className={form.chips}>
          {packages.map((p) => (
            <label key={p.id} className={form.chip}>
              <input type="radio" name="package" value={p.id} checked={pkg === p.id} onChange={() => (setPkg(p.id), clear('package'))} />
              <span className={form.radio} aria-hidden="true" />
              <span>
                {p.name} <span className={styles.price}>{p.price}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.package && (
          <span id="o-package-error" className={form.error}>
            {errors.package}
          </span>
        )}
      </fieldset>

      <div className={form.row}>
        <Input id="o-name" label={copy.fields.name} error={errors.name}>
          <input id="o-name" name="name" autoComplete="name" required {...field('name')} />
        </Input>
        <Input id="o-company" label={copy.fields.company} error={errors.company}>
          <input id="o-company" name="company" autoComplete="organization" required {...field('company')} />
        </Input>
      </div>
      <div className={form.row}>
        <Input id="o-email" label={copy.fields.email} error={errors.email}>
          <input id="o-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required {...field('email')} />
        </Input>
        <Input id="o-phone" label={copy.fields.phone}>
          <input id="o-phone" name="phone" type="tel" autoComplete="tel" />
        </Input>
      </div>
      <Input id="o-site" label={copy.fields.site} error={errors.site}>
        <input id="o-site" name="site" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="dinbutik.se" required {...field('site')} />
      </Input>
      <div className={form.row}>
        <Input id="o-platform" label={copy.fields.platform}>
          <select id="o-platform" name="platform" defaultValue="">
            <option value="">{copy.choose}</option>
            {Object.entries(platforms).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Input>
        <Input id="o-size" label={copy.fields.size}>
          <select id="o-size" name="size" defaultValue="">
            <option value="">{copy.choose}</option>
            {Object.entries(sizes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Input>
      </div>
      <Input id="o-message" label={copy.fields.message}>
        <textarea id="o-message" name="message" rows={3} placeholder={copy.fields.messagePlaceholder} />
      </Input>

      {report && (
        <p className={styles.attached}>
          <i aria-hidden="true" />
          {format(copy.attached, { host: report.host })}
        </p>
      )}

      <div className={styles.terms} data-invalid={errors.terms ? '' : undefined}>
        <label>
          <input type="checkbox" name="terms" required {...field('terms')} />
          <span>{copy.terms}</span>
        </label>
        {errors.terms && (
          <span id="o-terms-error" className={form.error}>
            {errors.terms}
          </span>
        )}
      </div>

      <div className={form.honeypot} aria-hidden="true">
        <label htmlFor="o-hp">{copy.fields.honeypot}</label>
        <input id="o-hp" name="company_site" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={form.footer}>
        <p className={form.privacy}>
          {copy.privacy.text} <a href={copy.privacy.link.href}>{copy.privacy.link.label}</a>
        </p>
        <Button type="submit" arrow>
          {sending ? copy.sending : copy.submit}
        </Button>
      </div>
      <div className={form.status} aria-live="polite">
        {failure && (
          <p data-tone="err">
            {failure} {mailHref && <a href={mailHref}>{copy.mailLink}</a>}
          </p>
        )}
      </div>
    </form>
  );
}

function Input({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className={form.field} data-invalid={error ? '' : undefined}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={`${id}-error`} className={form.error}>
          {error}
        </span>
      )}
    </div>
  );
}

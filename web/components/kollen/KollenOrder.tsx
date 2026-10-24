'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { format } from '@/lib/css';
import { shake } from '@/lib/motion';
import { track, turnstileToken } from '@/lib/site';
import type { order as OrderCopy } from '@/content/kollen';
import type { KollenPackage } from '../../../lib/kollen/catalog.js';
import type { KollenReport } from './KollenCheck';
import { RESULT_EVENT, toggleSelection, totalFor, useSelection } from './selection';
import form from '@/components/interactive/ProjectForm.module.css';
import order from '@/components/a11y/A11yOrder.module.css';
import styles from './KollenSections.module.css';

type Field = 'packages' | 'name' | 'company' | 'email' | 'site' | 'terms';
type Errors = Partial<Record<Field, string>>;
const ORDER: Field[] = ['packages', 'name', 'company', 'email', 'site', 'terms'];
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;
const SITE = /^(https?:\/\/)?[^\s/$.?#]+\.[^\s]{2,}$/i;

/**
 * Order → POST /api/lead with kind "kollen_order" and the picked packages. Wimco gets the order with the
 * result attached; the customer gets a confirmation that nothing is binding until they approve Wimco's
 * written confirmation. The picked packages are shared with the result and the package cards (selection.ts).
 */
export function KollenOrder({ copy, packages }: { copy: typeof OrderCopy; packages: Record<string, KollenPackage> }) {
  const selected = useSelection();
  const [report, setReport] = useState<KollenReport | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [mailHref, setMailHref] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; mailed: boolean } | null>(null);
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const list = Object.values(packages);

  useEffect(() => {
    startedAt.current = Date.now();
    const onResult = (e: Event) => {
      const r = (e as CustomEvent<KollenReport>).detail;
      setReport(r);
      const site = formRef.current?.elements.namedItem('site') as HTMLInputElement | null;
      if (site && !site.value) site.value = r.host;
    };
    window.addEventListener(RESULT_EVENT, onResult);
    const param = new URLSearchParams(window.location.search).get('paket');
    if (param) for (const id of param.split(',')) if (packages[id]) toggleSelection(id, true);
    return () => window.removeEventListener(RESULT_EVENT, onResult);
  }, [packages]);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  useEffect(() => {
    if (selected.length) setErrors((e) => (e.packages ? { ...e, packages: undefined } : e));
  }, [selected]);

  const clear = (f: Field) => setErrors((e) => (e[f] ? { ...e, [f]: undefined } : e));

  const focusFirst = (f: HTMLFormElement, errs: Errors) => {
    const first = ORDER.find((k) => errs[k]);
    if (!first) return;
    const el = (first === 'packages' ? f.querySelector('input[name="packages"]') : f.elements.namedItem(first)) as HTMLElement | null;
    el?.focus();
    shake(first === 'terms' || first === 'packages' ? el?.closest('fieldset, label') : el?.parentElement);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const f = e.currentTarget;
    const data = new FormData(f);
    const v = (n: string) => String(data.get(n) ?? '').trim();
    const body = {
      kind: 'kollen_order',
      startedAt: startedAt.current,
      packages: selected,
      name: v('name'),
      company: v('company'),
      email: v('email'),
      phone: v('phone'),
      site: v('site'),
      message: v('message'),
      terms: data.get('terms') === 'on',
      kollenId: report?.id ?? '',
      company_site: v('company_site'),
      turnstileToken: null as string | null,
    };
    const next: Errors = {};
    if (!body.packages.length) next.packages = copy.errors.packages;
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
        track('generate_lead', { kind: 'kollen_order', packages: body.packages.join(',') });
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
      const lines = [
        `${copy.packagesLegend} ${body.packages.map((id) => `${packages[id].name} (${packages[id].price})`).join(', ')}`,
        `${copy.fields.name}: ${body.name}`,
        `${copy.fields.company}: ${body.company}`,
        `${copy.fields.email}: ${body.email}`,
        `${copy.fields.site}: ${body.site}`,
      ];
      if (report) lines.push(`Resultat: ${window.location.origin}/e-handelskollen/?r=${report.id}`);
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
    'aria-describedby': errors[name] ? `k-${name}-error` : undefined,
    onInput: () => clear(name),
  });
  const total = totalFor(selected, packages);

  return (
    <form ref={formRef} className={form.form} onSubmit={onSubmit} noValidate>
      <fieldset className={form.types} aria-describedby={errors.packages ? 'k-packages-error' : undefined}>
        <legend className={form.legend}>{copy.packagesLegend}</legend>
        <div className={styles.pick}>
          {list.map((p) => (
            <label key={p.id} className={styles.pickItem} data-watch={p.monthly || undefined}>
              <input type="checkbox" name="packages" value={p.id} checked={selected.includes(p.id)} onChange={(e) => toggleSelection(p.id, e.target.checked)} />
              <span className={styles.box} aria-hidden="true" />
              <span className={styles.pickName}>{p.name}</span>
              <span className={styles.pickPrice}>{p.price}</span>
            </label>
          ))}
        </div>
        <p className={styles.total} aria-live="polite">
          {selected.length ? (
            <>
              {copy.total} <b>{total}</b> <span>{copy.totalNote}</span>
            </>
          ) : (
            <span>{copy.none}</span>
          )}
        </p>
        {errors.packages && (
          <span id="k-packages-error" className={form.error}>
            {errors.packages}
          </span>
        )}
      </fieldset>

      <div className={form.row}>
        <Input id="k-name" label={copy.fields.name} error={errors.name}>
          <input id="k-name" name="name" autoComplete="name" required {...field('name')} />
        </Input>
        <Input id="k-company" label={copy.fields.company} error={errors.company}>
          <input id="k-company" name="company" autoComplete="organization" required {...field('company')} />
        </Input>
      </div>
      <div className={form.row}>
        <Input id="k-email" label={copy.fields.email} error={errors.email}>
          <input id="k-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required {...field('email')} />
        </Input>
        <Input id="k-phone" label={copy.fields.phone}>
          <input id="k-phone" name="phone" type="tel" autoComplete="tel" />
        </Input>
      </div>
      <Input id="k-site" label={copy.fields.site} error={errors.site}>
        <input id="k-site" name="site" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="dinbutik.se" required {...field('site')} />
      </Input>
      <Input id="k-message" label={copy.fields.message}>
        <textarea id="k-message" name="message" rows={3} placeholder={copy.fields.messagePlaceholder} />
      </Input>

      {report && (
        <p className={order.attached}>
          <i aria-hidden="true" />
          {format(copy.attached, { host: report.host })}
        </p>
      )}

      <div className={order.terms} data-invalid={errors.terms ? '' : undefined}>
        <label>
          <input type="checkbox" name="terms" required {...field('terms')} />
          <span>{copy.terms}</span>
        </label>
        {errors.terms && (
          <span id="k-terms-error" className={form.error}>
            {errors.terms}
          </span>
        )}
      </div>

      <div className={form.honeypot} aria-hidden="true">
        <label htmlFor="k-hp">{copy.fields.honeypot}</label>
        <input id="k-hp" name="company_site" tabIndex={-1} autoComplete="off" />
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

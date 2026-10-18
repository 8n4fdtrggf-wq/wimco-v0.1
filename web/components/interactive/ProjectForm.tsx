'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { ProjectContent } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { LineBadge } from '@/components/ui/LineBadge';
import { format } from '@/lib/css';
import { shake } from '@/lib/motion';
import { track, turnstileToken } from '@/lib/site';
import styles from './ProjectForm.module.css';

type Field = 'name' | 'email' | 'message';
type FieldErrors = Partial<Record<Field, string>>;

// Same rules as validateLead() in lib/leads.js, so most errors are caught before sending.
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;

/**
 * Project request → POST /api/lead with kind "project".
 * Inline validation (first invalid field takes focus and shakes once). Server-side field errors are
 * mapped back onto the fields. If the lead API can't take the request, the visitor gets a
 * pre-filled e-mail link instead, so nothing is lost. The honeypot and `startedAt` match the API's bot checks.
 */
export function ProjectForm({ content, email }: { content: ProjectContent; email: string }) {
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [mailHref, setMailHref] = useState<string | null>(null);
  const [doneFor, setDoneFor] = useState<string | null>(null);
  const startedAt = useRef(0);
  const doneRef = useRef<HTMLDivElement>(null);
  const id = content.id;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (doneFor) doneRef.current?.focus();
  }, [doneFor]);

  const clearError = (field: Field) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const focusFirst = (form: HTMLFormElement, errs: FieldErrors) => {
    const first = (['name', 'email', 'message'] as const).find((k) => errs[k]);
    if (!first) return;
    const input = form.elements.namedItem(first) as HTMLInputElement | null;
    input?.focus();
    shake(input?.parentElement);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '').trim();
    const body = {
      kind: 'project',
      startedAt: startedAt.current,
      service: value('service'),
      name: value('name'),
      email: value('email'),
      company: value('company'),
      budget: value('budget'),
      message: value('message'),
      company_site: value('company_site'),
      turnstileToken: null as string | null,
    };

    const next: FieldErrors = {};
    if (!body.name) next.name = content.errors.name;
    if (!EMAIL.test(body.email)) next.email = content.errors.email;
    if (body.message.length < 10) next.message = content.errors.message;
    setErrors(next);
    setFailure(null);
    setMailHref(null);
    if (Object.keys(next).length) {
      focusFirst(form, next);
      return;
    }

    setSending(true);
    try {
      body.turnstileToken = await turnstileToken();
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: FieldErrors; message?: string };
      if (res.ok && json.ok) {
        track('generate_lead', { kind: 'project', service: body.service || undefined });
        setDoneFor(body.email);
        return;
      }
      if (json.errors && Object.keys(json.errors).length) {
        setErrors(json.errors);
        focusFirst(form, json.errors);
        return;
      }
      throw new Error(json.message || `lead ${res.status}`);
    } catch {
      setFailure(format(content.failure, { email }));
      const type = content.types.find((t) => t.service === body.service)?.label ?? '';
      const plain = (label: string) => label.replace(/\s*\(valfritt\)/i, '');
      const lines = [`${content.typeLegend} ${type}`, `${content.fields.name}: ${body.name}`, `${content.fields.email}: ${body.email}`];
      if (body.company) lines.push(`${plain(content.fields.company)}: ${body.company}`);
      if (body.budget) lines.push(`${plain(content.fields.budget)}: ${body.budget}`);
      lines.push('', body.message);
      setMailHref(`mailto:${email}?subject=${encodeURIComponent(content.mailSubject)}&body=${encodeURIComponent(lines.join('\n'))}`);
    } finally {
      setSending(false);
    }
  };

  if (doneFor) {
    return (
      <div ref={doneRef} className={styles.done} tabIndex={-1} role="status">
        <h4>{content.successTitle}</h4>
        <p>{format(content.successBody, { email: doneFor })}</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.types}>
        <legend className={styles.legend}>{content.typeLegend}</legend>
        <div className={styles.chips}>
          {content.types.map((t, i) => (
            <label key={t.service} className={styles.chip}>
              <input type="radio" name="service" value={t.service} defaultChecked={i === 0} />
              <LineBadge line={t.line} size="sm" />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.row}>
        <FormField id={`${id}-name`} label={content.fields.name} error={errors.name}>
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            onInput={() => clearError('name')}
          />
        </FormField>
        <FormField id={`${id}-email`} label={content.fields.email} error={errors.email}>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
            onInput={() => clearError('email')}
          />
        </FormField>
      </div>

      <div className={styles.row}>
        <FormField id={`${id}-company`} label={content.fields.company}>
          <input id={`${id}-company`} name="company" autoComplete="organization" />
        </FormField>
        <FormField id={`${id}-budget`} label={content.fields.budget}>
          <select id={`${id}-budget`} name="budget" defaultValue="">
            <option value="">–</option>
            {content.budgets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField id={`${id}-message`} label={content.fields.message} error={errors.message}>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          required
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${id}-message-error` : undefined}
          onInput={() => clearError('message')}
        />
      </FormField>

      {/* Honeypot: hidden from people and assistive tech; the API ignores requests that fill it. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${id}-company-site`}>{content.fields.honeypot}</label>
        <input id={`${id}-company-site`} name="company_site" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.footer}>
        <p className={styles.privacy}>
          {content.privacy.text} <a href={content.privacy.link.href}>{content.privacy.link.label}</a>
        </p>
        <Button type="submit" arrow>
          {sending ? content.sending : content.submit}
        </Button>
      </div>
      <div className={styles.status} aria-live="polite">
        {failure && (
          <p data-tone="err">
            {failure}{' '}
            {mailHref && <a href={mailHref}>{content.mailLink}</a>}
          </p>
        )}
      </div>
    </form>
  );
}

function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className={styles.field} data-invalid={error ? '' : undefined}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

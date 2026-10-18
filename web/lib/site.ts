/**
 * Bridge to the site's shared client code, /assets/js/site.js (public/assets/js/site.js in the repo root).
 * That module owns consent + Google Analytics, the Turnstile bot check and /api/config, and is also
 * used by the report page and the sub-pages. The start page loads it once as a module script in
 * app/layout.tsx; importing the same URL here returns that same instance.
 *
 * In `next dev` the file isn't served, so every call degrades to a no-op.
 */

interface SiteModule {
  track: (name: string, params?: Record<string, unknown>) => void;
  getTurnstileToken: () => Promise<string | null>;
}

let site: Promise<SiteModule | null> | null = null;

function load() {
  if (!site) {
    site = import(/* webpackIgnore: true */ '/assets/js/site.js' as string)
      .then((m) => m as SiteModule)
      .catch(() => null);
  }
  return site;
}

export async function track(name: string, params: Record<string, unknown> = {}) {
  (await load())?.track(name, params);
}

export async function turnstileToken() {
  try {
    return (await (await load())?.getTurnstileToken()) ?? null;
  } catch {
    return null;
  }
}

/** Remembers that this browser created a report, so the report page lets it change visibility. */
export function rememberOwner(reportId: string, ownerToken: string) {
  try {
    localStorage.setItem(`wimco-owner-${reportId}`, ownerToken);
  } catch {
    /* private mode */
  }
}

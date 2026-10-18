import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { LineBadge } from '@/components/ui/LineBadge';

export const metadata: Metadata = {
  title: 'Sidan finns inte – Wimco',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: '100svh', display: 'grid', alignContent: 'center', gap: 24, paddingBlock: 64 }}>
      <p style={{ display: 'flex', gap: 6, margin: 0 }}>
        <LineBadge line="h" />
        <LineBadge line="w" />
        <LineBadge line="a" />
        <LineBadge line="o" />
      </p>
      <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)' }}>
        Den här stationen finns inte.
      </h1>
      <p className="lede">Länken kan vara gammal eller felstavad. Startsidan har allt om hemsidor, webbverktyg och automation.</p>
      <div>
        <Button href="/" arrow>
          Till startsidan
        </Button>
      </div>
    </main>
  );
}

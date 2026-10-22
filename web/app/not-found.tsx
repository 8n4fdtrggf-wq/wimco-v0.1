import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/score/ScoreRing';

export const metadata: Metadata = {
  title: 'Sidan finns inte – Wimco',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: '100svh', display: 'grid', alignContent: 'center', gap: 24, paddingBlock: 64 }}>
      <div style={{ width: 120 }}>
        <ScoreRing size="md" label="" scores={[0, 0, 0, 0, 0, 0]} />
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)' }}>
        Den här sidan finns inte.
      </h1>
      <p className="lede">Länken kan vara gammal eller felstavad. På startsidan kan du analysera din webbplats gratis.</p>
      <div>
        <Button href="/" arrow>
          Till startsidan
        </Button>
      </div>
    </main>
  );
}

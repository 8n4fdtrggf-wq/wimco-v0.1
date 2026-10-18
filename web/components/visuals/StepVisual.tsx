'use client';

import type { RefObject } from 'react';
import type { ServicesContent, VisualKind } from '@/content/types';
import { SiteMock } from './SiteMock';
import { PortalMock } from './PortalMock';
import { FlowMock } from './FlowMock';
import { RingsMock, type RingsHandle } from './RingsMock';

interface Props {
  kind: VisualKind;
  active: boolean;
  content: ServicesContent;
  ringsRef: RefObject<RingsHandle | null>;
  driven: 'scroll' | 'spring';
}

/** Maps a content `visual` key to its component. Add a new visual here and in VisualKind. */
export function StepVisual({ kind, active, content, ringsRef, driven }: Props) {
  switch (kind) {
    case 'site':
      return <SiteMock active={active} />;
    case 'portal':
      return <PortalMock active={active} head={content.portal.head} rows={content.portal.rows} />;
    case 'flow':
      return <FlowMock active={active} nodes={content.flow} />;
    case 'rings':
      return <RingsMock ref={ringsRef} active={active} driven={driven} items={content.rings.items} bands={content.rings.bands} />;
  }
}

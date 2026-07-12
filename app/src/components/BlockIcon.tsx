import {
  CalendarClock, Columns2, GalleryHorizontal, Image, Info, ListChecks, MousePointerClick,
  MoveVertical, PanelBottom, PanelTop, Quote, RectangleHorizontal, SeparatorHorizontal, Tag, TextCursorInput,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { CanvasBlockType } from '@/lib/types';

const icons = {
  header: PanelTop,
  hero: Image,
  text: TextCursorInput,
  'image-text': Columns2,
  gallery: GalleryHorizontal,
  bullets: ListChecks,
  infobox: CalendarClock,
  quote: Quote,
  cta: MousePointerClick,
  band: RectangleHorizontal,
  badge: Tag,
  callout: Info,
  divider: SeparatorHorizontal,
  spacer: MoveVertical,
  footer: PanelBottom,
} satisfies Record<CanvasBlockType, ComponentType<LucideProps>>;

export default function BlockIcon({ type, ...props }: { type: CanvasBlockType } & LucideProps) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" {...props} />;
}

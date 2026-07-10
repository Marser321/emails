import {
  AlarmClock, BadgeCheck, ChartNoAxesCombined, Flame, GraduationCap, Hand,
  Newspaper, Send, ShoppingCart, type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { TemplateType } from '@/lib/types';

const icons = {
  masterclass: GraduationCap,
  registration: BadgeCheck,
  followup: Send,
  promo: Flame,
  reminder: AlarmClock,
  newsletter: Newspaper,
  sales: ShoppingCart,
  financial_advisory: ChartNoAxesCombined,
  onboarding: Hand,
} satisfies Record<TemplateType, ComponentType<LucideProps>>;

export default function TemplateIcon({ type, ...props }: { type: TemplateType } & LucideProps) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" {...props} />;
}

import {
  Dumbbell,
  GraduationCap,
  Plane,
  Receipt,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import type { BillCategory } from '../types/bill';

interface CategoryVisual {
  icon: typeof Utensils;
  colorClass: string;
  barClass: string;
}

export const CATEGORY_VISUALS: Record<BillCategory, CategoryVisual> = {
  'Ăn uống': {
    icon: Utensils,
    colorClass: 'text-orange-600 dark:text-orange-400',
    barClass: 'bg-orange-500 dark:bg-orange-400',
  },
  'Mua sắm': {
    icon: ShoppingBag,
    colorClass: 'text-sky-600 dark:text-sky-400',
    barClass: 'bg-sky-500 dark:bg-sky-400',
  },
  'Học phí': {
    icon: GraduationCap,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    barClass: 'bg-indigo-500 dark:bg-indigo-400',
  },
  'Du lịch': {
    icon: Plane,
    colorClass: 'text-teal-600 dark:text-teal-400',
    barClass: 'bg-teal-500 dark:bg-teal-400',
  },
  'Thể thao': {
    icon: Dumbbell,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500 dark:bg-emerald-400',
  },
  'Khác': {
    icon: Receipt,
    colorClass: 'text-slate-500 dark:text-slate-400',
    barClass: 'bg-slate-500 dark:bg-slate-400',
  },
};

export function CategoryLabel({
  category,
  className = '',
}: {
  category: BillCategory;
  className?: string;
}) {
  const visual = CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS['Khác'];
  const Icon = visual.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${visual.colorClass}`} />
      <span className="truncate">{category}</span>
    </span>
  );
}

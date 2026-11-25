import type { Timestamp } from 'firebase/firestore';

export const BILL_NAME_MIN_LENGTH = 1;
export const BILL_NAME_MAX_LENGTH = 120;
export const BILL_MAX_AMOUNT = 1_000_000_000_000;
export const BILL_DATE_PATTERN = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

export const BILL_CATEGORIES = [
  'Ăn uống',
  'Mua sắm',
  'Học phí',
  'Du lịch',
  'Thể thao',
  'Khác',
] as const;

export type BillCategory = (typeof BILL_CATEGORIES)[number];

export function normalizeBillCategory(raw: unknown): BillCategory {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if ((BILL_CATEGORIES as readonly string[]).includes(trimmed)) {
      return trimmed as BillCategory;
    }
  }
  return 'Khác';
}

export interface BillRecord {
  id: string;
  userId: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: BillCategory;
  isPaid: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BillInput {
  name: string;
  amount: number;
  date: string;
  category: BillCategory;
  isPaid: boolean;
}

export type AppView = 'calendar' | 'ledger' | 'weekly';
export type PaymentFilter = 'all' | 'unpaid' | 'paid';
export type ThemeMode = 'light' | 'dark';

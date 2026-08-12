export type TxnType =
  | 'personal_expense' | 'business_expense' | 'income' | 'investment'
  | 'own_transfer' | 'family_transfer' | 'cc_payment' | 'emi_loan'
  | 'loan_given' | 'loan_repayment' | 'reimb_expected' | 'reimb_received'
  | 'refund' | 'cash' | 'unclassified';

export const TYPES: { id: TxnType; label: string; expense: boolean }[] = [
  { id: 'personal_expense', label: 'Personal expense', expense: true },
  { id: 'business_expense', label: 'Business expense', expense: false },
  { id: 'income', label: 'Income', expense: false },
  { id: 'investment', label: 'Investment', expense: false },
  { id: 'own_transfer', label: 'Own transfer', expense: false },
  { id: 'family_transfer', label: 'Family transfer', expense: false },
  { id: 'cc_payment', label: 'Credit-card payment', expense: false },
  { id: 'emi_loan', label: 'EMI / loan payment', expense: false },
  { id: 'loan_given', label: 'Loan given', expense: false },
  { id: 'loan_repayment', label: 'Loan repayment', expense: false },
  { id: 'reimb_expected', label: 'Reimbursement expected', expense: false },
  { id: 'reimb_received', label: 'Reimbursement received', expense: false },
  { id: 'refund', label: 'Refund', expense: false },
  { id: 'cash', label: 'Cash withdrawal', expense: false },
  { id: 'unclassified', label: 'Unclassified', expense: false },
];

export const CATEGORIES = [
  { id: 'housing', label: 'Housing', color: '#22D3A6' },
  { id: 'food', label: 'Food & Dining', color: '#FF9F6B' },
  { id: 'groceries', label: 'Groceries', color: '#66BB6A' },
  { id: 'transport', label: 'Transport & Fuel', color: '#5DC0FF' },
  { id: 'health', label: 'Health & Care', color: '#FF6B9E' },
  { id: 'medical', label: 'Medical & Pharmacy', color: '#EF5350' },
  { id: 'subs', label: 'Subscriptions', color: '#8B93AC' },
  { id: 'entertainment', label: 'Entertainment', color: '#E040FB' },
  { id: 'fashion', label: 'Fashion', color: '#C77DFF' },
  { id: 'shopping', label: 'Shopping', color: '#5C6BC0' },
  { id: 'travel', label: 'Travel', color: '#FFD166' },
  { id: 'family', label: 'Family', color: '#6C7BFF' },
  { id: 'utilities', label: 'Utilities', color: '#4ECFCF' },
  { id: 'education', label: 'Education', color: '#A0E86F' },
  { id: 'household', label: 'Household help', color: '#F5A623' },
  { id: 'insurance', label: 'Insurance', color: '#78909C' },
  { id: 'loan', label: 'Loans & EMI', color: '#FF7043' },
  { id: 'taxes', label: 'Taxes & Fees', color: '#8D6E63' },
  { id: 'fitness', label: 'Fitness & Sports', color: '#9CCC65' },
  { id: 'personal_care', label: 'Personal Care', color: '#26C6DA' },
  { id: 'gifts', label: 'Gifts & Donations', color: '#EC407A' },
  { id: 'investments', label: 'Investments', color: '#2E7D32' },
  { id: 'other', label: 'Other', color: '#7A8296' },
];

export const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Needs review', color: '#F5A623' },
  accepted: { label: 'Verified', color: '#22D3A6' },
  unknown: { label: 'Unknown', color: '#FF6B6B' },
  deferred: { label: 'Deferred', color: '#6C7BFF' },
  duplicate: { label: 'Duplicate', color: '#7A8296' },
};

export function typeInfo(id: string) {
  return TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1];
}
export function catInfo(id: string | null) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
export function fmt(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN');
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function friendlyDate(d: string | null, withYear = false): string {
  if (!d) return 'no date';
  const [y, m, day] = d.split('-');
  const base = `${Number(day)} ${MONTH_ABBR[Number(m) - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

/** Splits an amount into integer + decimal parts so paise can be rendered in a lighter weight, Cred-style. */
export function fmtParts(n: number): { int: string; dec: string } {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  return { int: Number(intPart).toLocaleString('en-IN'), dec: decPart };
}

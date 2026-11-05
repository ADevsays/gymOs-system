export interface CashSession {
  id: number;
  openedAt: string;
  closedAt?: string | null;
  openingBalance: number;
  closingBalance?: number | null;
  expectedCash?: number | null;
  difference?: number | null;
  status: 'open' | 'closed';
  notes?: string | null;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  cashMovementId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CashMovement {
  id: number;
  cashRegisterId?: number | null;
  type: 'income' | 'expense';
  category: 'membership' | 'product' | 'sporadic' | 'expense';
  concept: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'card';
  memberId?: number | null;
  customerName?: string | null;
  paymentId?: number | null;
  receiptPath?: string | null;
  notes?: string | null;
  createdAt: string;
  items?: SaleItem[];
}

export interface CashKpis {
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  cashIncome: number;
  cashExpenses: number;
  expectedCashInDrawer: number;
  transferIncome: number;
  transferExpenses: number;
  netTransfer: number;
  membershipIncome: number;
  productIncome: number;
  sporadicIncome: number;
}

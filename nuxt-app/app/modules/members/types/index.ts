export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  cedula: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  bloodType?: string;
  phone?: string;
  eps?: string;
  email?: string;
  photoPath?: string;
  cedulaFrontPath?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  memberId: number;
  planId: number;
  planName: string;
  planPrice: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
}

export interface Payment {
  id: number;
  memberId: number;
  subscriptionId?: number;
  amount: number;
  method: string;
  paidAt: string;
  notes?: string;
  receiptPath?: string;
  transferReference?: string;
  createdAt: string;
}

export interface MemberListItem extends Pick<Member, 'id' | 'firstName' | 'lastName' | 'cedula' | 'isArchived' | 'createdAt' | 'photoPath'> {
  activeSubscription?: Subscription | null;
}

export interface MemberDetail extends Member {
  subscriptions: Subscription[];
  payments: Payment[];
  beneficiaries?: any[];
  payer?: any;
  ltv: number;
}

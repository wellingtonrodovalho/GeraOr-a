export type ItemType = 'product' | 'service';

export interface QuoteItem {
  id: string;
  type: ItemType;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface Quote {
  id: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  items: QuoteItem[];
  total: number;
  status: QuoteStatus;
  userId: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

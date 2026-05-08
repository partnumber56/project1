import { Timestamp } from 'firebase/firestore';

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Request';
export type ItemStatus = 'Pending' | 'Ordered' | 'Available' | 'Out of Stock' | 'Picked' | 'Packed' | 'Issued';

export interface Product {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  supplier?: string;
  stock: number;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
}

export interface Order {
  id: string;
  clientId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  carModel?: string;
  vin?: string;
  carYear?: string;
  engineVolume?: string;
  status: OrderStatus;
  totalAmount: number;
  totalProfit?: number;
  isFinancialProcessed?: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  creatorId: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  partNumber: string;
  brand?: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  deliveryTime?: string;
  status: ItemStatus;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Timestamp;
}

export interface Car {
  id: string;
  model: string;
  vin?: string;
  year?: string;
  engineVolume?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number; // positive = credit/prepayment, negative = debt
  totalTurnover: number;
  createdAt: Timestamp;
}

export interface FinancialTransaction {
  id: string;
  clientId: string;
  amount: number; // positive = income (payment from client), negative = expense (refund or order cost if using balance)
  type: 'Payment' | 'Refund' | 'Order' | 'Adjustment';
  description: string;
  orderId?: string;
  createdAt: Timestamp;
}

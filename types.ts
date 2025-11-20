export interface Product {
  barcode: string;
  systemCode: string;
  name: string;
}

export interface InvoiceItem {
  barcode: string;
  name: string;
  invoiceQuantity: number;
}

export interface InventoryLog {
  id: string;
  barcode: string;
  quantity: number;
  timestamp: number;
}

export interface ReportItem {
  systemCode: string;
  barcode: string;
  name: string;
  invoiceQuantity: number;
  countedQuantity: number;
  difference: number; // counted - invoice
  status: 'MATCH' | 'MISSING' | 'SURPLUS';
}

export enum ViewState {
  UPLOAD = 'UPLOAD',
  COLLECT = 'COLLECT',
  INVOICE = 'INVOICE',
  REPORT = 'REPORT',
  ADMIN = 'ADMIN',
}

export interface InventorySummary {
  totalItems: number;
  uniqueProductsScanned: number;
  mostScannedProduct: string;
  leastScannedProduct: string;
}

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this should be hashed. For LocalStorage demo, we keep as string.
  role: UserRole;
  name: string;
}

export interface Product {
  barcode: string;
  systemCode: string;
  name: string;
}

export interface InvoiceItem {
  barcode: string;
  systemCode: string;
  name: string;
  invoiceQuantity: number;
  conversionFactor?: number; // New: Multiplier (default 1)
}

export interface InventoryLog {
  id: string;
  invoiceNumber: string; // Links log to a specific invoice
  userId: string;        // Links log to specific user
  barcode: string;
  quantity: number;
  timestamp: number;
}

export interface ReportItem {
  systemCode: string;
  barcode: string;
  name: string;
  invoiceQuantity: number;
  conversionFactor: number; // New
  convertedQuantity: number; // New: invoiceQuantity * conversionFactor
  countedQuantity: number;
  difference: number; // counted - convertedQuantity
  status: 'MATCH' | 'MISSING' | 'SURPLUS';
}

export enum ViewState {
  UPLOAD = 'UPLOAD',
  COLLECT = 'COLLECT',
  INVOICE = 'INVOICE',
  REPORT = 'REPORT',
  ADMIN = 'ADMIN',
  // New States for Dashboards
  DASHBOARD_COLLECTOR = 'DASHBOARD_COLLECTOR',
  DASHBOARD_VALIDATOR = 'DASHBOARD_VALIDATOR',
}

export type UserRole = 'ADMIN' | 'COLLECTOR' | 'VALIDATOR';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
}

// Helper to list active sessions (unique invoice numbers)
export interface InventorySessionSummary {
  invoiceNumber: string;
  lastActivity: number;
  totalItemsScanned: number;
  usersInvolved: string[];
}

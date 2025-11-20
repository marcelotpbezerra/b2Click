export interface Product {
  barcode: string;
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
}

export interface InventorySummary {
  totalItems: number;
  uniqueProductsScanned: number;
  mostScannedProduct: string;
  leastScannedProduct: string;
}
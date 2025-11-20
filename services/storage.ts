import { STORAGE_KEYS } from '../constants';
import { InventoryLog, Product, InvoiceItem } from '../types';

// --- Products DB ---
export const getStoredProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load products", e);
    return [];
  }
};

export const saveProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error("Failed to save products", e);
  }
};

export const clearProducts = (): void => {
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
};

// --- Invoice Data ---
export const getInvoiceData = (): InvoiceItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICE);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load invoice data", e);
    return [];
  }
};

export const saveInvoiceData = (items: InvoiceItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICE, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save invoice data", e);
  }
};

export const clearInvoiceData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.INVOICE);
};

// --- Logs ---
export const getInventoryLogs = (): InventoryLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load logs", e);
    return [];
  }
};

export const addInventoryLog = (log: Omit<InventoryLog, 'id'>): InventoryLog => {
  const logs = getInventoryLogs();
  const newLog: InventoryLog = {
    ...log,
    id: crypto.randomUUID(),
  };
  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  return newLog;
};

export const clearInventoryLogs = (): void => {
  localStorage.removeItem(STORAGE_KEYS.LOGS);
};
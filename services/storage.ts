import { STORAGE_KEYS } from '../constants';
import { InventoryLog, Product, InvoiceItem, User } from '../types';

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

// --- User Management & Auth ---

const DEFAULT_ADMIN: User = {
  id: 'admin-default',
  username: 'admin',
  password: '120619@Mani',
  role: 'ADMIN',
  name: 'Administrador Padrão'
};

export const getUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) {
      // Initialize with default admin if no users exist
      const initialUsers = [DEFAULT_ADMIN];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load users", e);
    return [DEFAULT_ADMIN];
  }
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const deleteUser = (userId: string): void => {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
};

export const authenticateUser = (username: string, password: string): User | null => {
  // Ensure users are initialized
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  return user || null;
};

export const checkUsernameExists = (username: string, excludeId?: string): boolean => {
  const users = getUsers();
  return users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeId);
};
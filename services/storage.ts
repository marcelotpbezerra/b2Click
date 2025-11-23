
import { STORAGE_KEYS } from '../constants';
import { InventoryLog, Product, InvoiceItem, User, InventorySessionSummary } from '../types';

// --- Products DB (Global) ---
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

// --- Invoice Data (Scoped by Invoice Number) ---
// Stored as a Map object in localStorage: { "12345": [items...], "67890": [items...] }
export const getInvoiceData = (invoiceNumber?: string): InvoiceItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICE);
    const allInvoices = stored ? JSON.parse(stored) : {};
    
    if (invoiceNumber) {
      return allInvoices[invoiceNumber] || [];
    }
    // If no specific invoice requested, return empty (or could return all flat if needed)
    return [];
  } catch (e) {
    console.error("Failed to load invoice data", e);
    return [];
  }
};

export const saveInvoiceData = (invoiceNumber: string, items: InvoiceItem[]): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICE);
    const allInvoices = stored ? JSON.parse(stored) : {};
    
    allInvoices[invoiceNumber] = items;
    
    localStorage.setItem(STORAGE_KEYS.INVOICE, JSON.stringify(allInvoices));
  } catch (e) {
    console.error("Failed to save invoice data", e);
  }
};

export const updateInvoiceItemQuantity = (invoiceNumber: string, systemCode: string, barcode: string, newQuantity: number): void => {
  try {
    const items = getInvoiceData(invoiceNumber);
    const index = items.findIndex(item => 
      (item.systemCode && item.systemCode === systemCode) || 
      (item.barcode && item.barcode === barcode)
    );

    if (index !== -1) {
      items[index].invoiceQuantity = newQuantity;
      saveInvoiceData(invoiceNumber, items);
    }
  } catch (e) {
    console.error("Failed to update invoice item", e);
  }
};

export const updateInvoiceItemFactor = (invoiceNumber: string, systemCode: string, barcode: string, newFactor: number): void => {
  try {
    const items = getInvoiceData(invoiceNumber);
    const index = items.findIndex(item => 
      (item.systemCode && item.systemCode === systemCode) || 
      (item.barcode && item.barcode === barcode)
    );

    if (index !== -1) {
      items[index].conversionFactor = newFactor;
      saveInvoiceData(invoiceNumber, items);
    }
  } catch (e) {
    console.error("Failed to update invoice item factor", e);
  }
};

export const clearInvoiceData = (invoiceNumber?: string): void => {
  if (invoiceNumber) {
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICE);
    const allInvoices = stored ? JSON.parse(stored) : {};
    delete allInvoices[invoiceNumber];
    localStorage.setItem(STORAGE_KEYS.INVOICE, JSON.stringify(allInvoices));
  } else {
    localStorage.removeItem(STORAGE_KEYS.INVOICE);
  }
};

// --- Logs (Scoped by Invoice Number effectively) ---
export const getInventoryLogs = (invoiceNumber?: string): InventoryLog[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
    const allLogs: InventoryLog[] = stored ? JSON.parse(stored) : [];
    
    if (invoiceNumber) {
      return allLogs.filter(log => log.invoiceNumber === invoiceNumber);
    }
    return allLogs;
  } catch (e) {
    console.error("Failed to load logs", e);
    return [];
  }
};

export const addInventoryLog = (log: Omit<InventoryLog, 'id'>): InventoryLog => {
  const logs = getInventoryLogs(); // Get ALL logs
  const newLog: InventoryLog = {
    ...log,
    id: crypto.randomUUID(),
  };
  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  return newLog;
};

export const clearInventoryLogs = (invoiceNumber?: string): void => {
  if (invoiceNumber) {
    const logs = getInventoryLogs();
    const keptLogs = logs.filter(log => log.invoiceNumber !== invoiceNumber);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(keptLogs));
  } else {
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  }
};

// Helper to get active sessions based on logs
export const getActiveSessions = (): InventorySessionSummary[] => {
  const logs = getInventoryLogs();
  const sessionsMap: Record<string, InventorySessionSummary> = {};

  logs.forEach(log => {
    if (!sessionsMap[log.invoiceNumber]) {
      sessionsMap[log.invoiceNumber] = {
        invoiceNumber: log.invoiceNumber,
        lastActivity: log.timestamp,
        totalItemsScanned: 0,
        usersInvolved: []
      };
    }
    
    const session = sessionsMap[log.invoiceNumber];
    session.lastActivity = Math.max(session.lastActivity, log.timestamp);
    session.totalItemsScanned += 1; // Count distinct scans, or log.quantity for total units
    if (!session.usersInvolved.includes(log.userId)) {
      session.usersInvolved.push(log.userId);
    }
  });

  return Object.values(sessionsMap).sort((a, b) => b.lastActivity - a.lastActivity);
};

// --- XML Parser for NFe ---

export const getInvoiceNumberFromXML = (xmlContent: string): string | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    
    // Tenta encontrar a tag nNF dentro de ide
    const ide = xmlDoc.getElementsByTagName("ide")[0];
    if (ide) {
      const nNF = ide.getElementsByTagName("nNF")[0]?.textContent;
      return nNF || null;
    }
    return null;
  } catch (e) {
    console.error("Failed to extract invoice number", e);
    return null;
  }
}

export const parseNFeXML = (xmlContent: string): InvoiceItem[] => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    const items: InvoiceItem[] = [];

    // Handle namespaces (NFe usually has standard ns)
    // We look for 'det' tags
    const detNodes = xmlDoc.getElementsByTagName("det");
    
    for (let i = 0; i < detNodes.length; i++) {
      const det = detNodes[i];
      const prod = det.getElementsByTagName("prod")[0];
      
      if (prod) {
        const cEAN = prod.getElementsByTagName("cEAN")[0]?.textContent || "";
        const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
        const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
        const qCom = prod.getElementsByTagName("qCom")[0]?.textContent || "0";
        
        // cEAN often comes as "SEM GTIN" which means no barcode
        const barcode = (cEAN === "SEM GTIN" || cEAN === "") ? "" : cEAN;
        
        items.push({
          barcode: barcode,
          systemCode: cProd,
          name: xProd,
          invoiceQuantity: parseFloat(qCom),
          conversionFactor: 1
        });
      }
    }
    return items;
  } catch (e) {
    console.error("XML Parse Error", e);
    throw new Error("Falha ao processar XML da NFe.");
  }
};

// --- User Management ---

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
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  return user || null;
};

export const checkUsernameExists = (username: string, excludeId?: string): boolean => {
  const users = getUsers();
  return users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeId);
};

export const getUserName = (userId: string): string => {
  const users = getUsers();
  const u = users.find(u => u.id === userId);
  return u ? u.name : 'Usuário Removido';
}

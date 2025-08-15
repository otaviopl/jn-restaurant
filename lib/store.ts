// Types
export type SkewerFlavor = 'Carne' | 'Frango' | 'Queijo' | 'Calabresa';
export type Beverage = 'Coca-Cola' | 'Guaraná' | 'Água' | 'Suco';

export interface OrderItem {
  id: string;
  type: 'skewer' | 'beverage';
  flavor?: SkewerFlavor;
  beverage?: Beverage;
  qty: number;
  deliveredQty: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  status: 'em_preparo' | 'entregue';
  createdAt: Date;
}

export interface InventoryItem {
  flavor: SkewerFlavor;
  quantity: number;
  initialQuantity?: number; // Optional: quantidade inicial do estoque
}

// In-memory state
let orders: Order[] = [];
let inventory: InventoryItem[] = [
  { flavor: 'Carne', quantity: 20 },
  { flavor: 'Frango', quantity: 20 },
  { flavor: 'Queijo', quantity: 20 },
  { flavor: 'Calabresa', quantity: 20 },
];

// Dynamic products received via webhook
let availableFlavors: SkewerFlavor[] = ['Carne', 'Frango', 'Queijo', 'Calabresa'];
let availableBeverages: Beverage[] = ['Coca-Cola', 'Guaraná', 'Água', 'Suco'];
let lastSync: Date | null = null;

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function calculateOrderStatus(order: Order): 'em_preparo' | 'entregue' {
  const allDelivered = order.items.every(item => item.deliveredQty >= item.qty);
  return allDelivered ? 'entregue' : 'em_preparo';
}

// Inventory management
export function getInventory(): InventoryItem[] {
  return [...inventory];
}

export function setInventory(flavor: SkewerFlavor, quantity: number): void {
  const item = inventory.find(inv => inv.flavor === flavor);
  if (item) {
    item.quantity = Math.max(0, quantity);
  }
}

export function decInventory(flavor: SkewerFlavor, quantity: number): boolean {
  const item = inventory.find(inv => inv.flavor === flavor);
  if (item && item.quantity >= quantity) {
    item.quantity -= quantity;
    return true;
  }
  return false;
}

export function updateInventory(updates: Partial<Record<SkewerFlavor, number>>): void {
  (Object.entries(updates) as [SkewerFlavor, number][]).forEach(([flavor, quantity]) => {
    if (quantity !== undefined) {
      setInventory(flavor, quantity);
    }
  });
}

// Order management
export function listOrders(): Order[] {
  return orders.map(order => ({
    ...order,
    status: calculateOrderStatus(order)
  }));
}

export function createOrder(
  customerName: string,
  items: Omit<OrderItem, 'id' | 'deliveredQty'>[]
): { success: boolean; message?: string; order?: Order } {
  // Validate stock
  const skewerItems = items.filter(item => item.type === 'skewer');
  
  for (const item of skewerItems) {
    if (item.flavor) {
      const inventoryItem = inventory.find(inv => inv.flavor === item.flavor);
      if (!inventoryItem || inventoryItem.quantity < item.qty) {
        return {
          success: false,
          message: `Estoque insuficiente para ${item.flavor}. Disponível: ${inventoryItem?.quantity || 0}, Solicitado: ${item.qty}`
        };
      }
    }
  }

  // Decrement inventory
  for (const item of skewerItems) {
    if (item.flavor) {
      decInventory(item.flavor, item.qty);
    }
  }

  // Create order
  const order: Order = {
    id: generateId(),
    customerName,
    items: items.map(item => ({
      ...item,
      id: generateId(),
      deliveredQty: 0
    })),
    status: 'em_preparo',
    createdAt: new Date()
  };

  orders.push(order);
  
  return { success: true, order };
}

export function updateDeliveredQty(
  orderId: string,
  itemId: string,
  deliveredQty: number
): { success: boolean; message?: string } {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return { success: false, message: 'Pedido não encontrado' };
  }

  const item = order.items.find(i => i.id === itemId);
  if (!item) {
    return { success: false, message: 'Item não encontrado' };
  }

  if (deliveredQty < 0 || deliveredQty > item.qty) {
    return { 
      success: false, 
      message: `Quantidade entregue deve estar entre 0 e ${item.qty}` 
    };
  }

  item.deliveredQty = deliveredQty;
  order.status = calculateOrderStatus(order);

  return { success: true };
}

export function getOrder(orderId: string): Order | null {
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;
  
  return {
    ...order,
    status: calculateOrderStatus(order)
  };
}

// Products management
export function getAvailableFlavors(): SkewerFlavor[] {
  return [...availableFlavors];
}

export function getAvailableBeverages(): Beverage[] {
  return [...availableBeverages];
}

export function updateAvailableProducts(
  flavors?: SkewerFlavor[],
  beverages?: Beverage[]
): void {
  if (flavors && Array.isArray(flavors)) {
    availableFlavors = [...flavors];
  }
  
  if (beverages && Array.isArray(beverages)) {
    availableBeverages = [...beverages];
  }
  
  lastSync = new Date();
}

export function getProductsInfo(): {
  flavors: SkewerFlavor[];
  beverages: Beverage[];
  lastSync: Date | null;
} {
  return {
    flavors: getAvailableFlavors(),
    beverages: getAvailableBeverages(),
    lastSync
  };
}

// Sync management
export function getLastSyncTime(): Date | null {
  return lastSync;
}

export function markSyncTime(): void {
  lastSync = new Date();
}

// Enhanced inventory functions with sync support
export function syncInventoryFromWebhook(updates: Partial<Record<SkewerFlavor, number>>): void {
  updateInventory(updates);
  markSyncTime();
}

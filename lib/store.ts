import { promises as fs } from 'fs';
import path from 'path';
import {
  fetchExternalOrders,
  fetchExternalInventory,
  sendInventoryUpdate,
  sendCreateOrder,
  sendUpdateOrder,
  sendDeleteOrder,
  sendUpdateOrderItem,
  sendDeleteOrderItem
} from './external-data';
import { ItemStatus } from '../types/order'; // Import ItemStatus

// --- TYPES ---
export type SkewerFlavor = string;
export type Beverage = string;

export interface OrderItem {
  id: string;
  type: 'skewer' | 'beverage';
  flavor?: SkewerFlavor;
  beverage?: Beverage;
  qty: number;
  deliveredQty: number;
  status?: ItemStatus; // Added new status field
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  status: 'em_preparo' | 'entregue' | 'todo' | 'in_progress' | 'done' | 'canceled';
  createdAt: Date;
  source: 'local' | 'external';
  modified?: boolean;
}

export interface InventoryItem {
  flavor: SkewerFlavor;
  quantity: number;
  initialQuantity?: number;
}

interface DbData {
  orders: Order[];
  inventory: InventoryItem[];
  products: {
    flavors: SkewerFlavor[];
    beverages: Beverage[];
  };
  lastSync?: Date; // Add lastSync property
}

// --- DATABASE (JSON file) ---
const dbPath = '/tmp/db.json';
let memoryCache: DbData | null = null;

const db = {
  read: async (): Promise<DbData> => {
    if (memoryCache) {
      return memoryCache;
    }
    try {
      const fileContent = await fs.readFile(dbPath, 'utf-8');
      memoryCache = JSON.parse(fileContent);
      
      return memoryCache!;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('db.json not found. Initializing from external API.');
        const [initialOrders, initialInventory] = await Promise.all([
          fetchExternalOrders(),
          fetchExternalInventory()
        ]);

        const initialData: DbData = {
          orders: initialOrders || [],
          inventory: initialInventory || [],
          products: {
            flavors: initialInventory?.map(i => i.flavor) || [],
            beverages: ['Coca-Cola', 'Guaraná', 'Água', 'Suco']
          },
          lastSync: new Date() // Initialize lastSync
        };
        await db.write(initialData);
        memoryCache = initialData;
        
        return initialData;
      }
      throw error;
    }
  },
  write: async (data: DbData) => {
    data.lastSync = new Date(); // Update lastSync on write
    memoryCache = data;
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }
};

export function getLastSyncTime(): Date | undefined {
  const lastSync = memoryCache?.lastSync;
  if (!lastSync) return undefined;
  
  // Ensure it's a Date object
  if (lastSync instanceof Date) {
    return lastSync;
  }
  
  // If it's a string, try to parse it
  if (typeof lastSync === 'string') {
    const parsed = new Date(lastSync);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  
  return undefined;
}

export function getAvailableFlavors(): SkewerFlavor[] {
  return memoryCache?.products?.flavors || [];
}

export function getAvailableBeverages(): Beverage[] {
  return memoryCache?.products?.beverages || [];
}

// --- UTILITY FUNCTIONS ---
function generateId(prefix = 'local'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateOrderStatus(order: Order): 'todo' | 'in_progress' | 'done' | 'canceled' {
  // If the order is explicitly 'todo', keep it 'todo'.
  if (order.status === 'todo') {
    return 'todo';
  }

  // If the order already has a new Kanban status (other than 'todo'), keep it.
  if (['in_progress', 'done', 'canceled'].includes(order.status)) {
    return order.status as 'in_progress' | 'done' | 'canceled';
  }

  // Map old statuses to new Kanban statuses.
  const allDelivered = order.items.every(item => item.deliveredQty >= item.qty);

  if (order.status === 'entregue') {
    return 'done';
  }
  
  // For 'em_preparo' or any other non-Kanban status, determine based on delivery.
  // This also acts as a fallback for any unexpected status.
  return allDelivered ? 'done' : 'in_progress';
}

// Helper to adjust inventory quantity with validation
async function adjustInventoryQuantity(
  dbData: DbData,
  flavor: SkewerFlavor,
  change: number // positive for decrement, negative for increment
): Promise<{ success: boolean; message?: string }> {
  const inventoryItem = dbData.inventory.find(inv => inv.flavor === flavor);

  if (!inventoryItem) {
    return { success: false, message: `Sabor de espeto "${flavor}" não encontrado no inventário.` };
  }

  if (inventoryItem.quantity < change) {
    return { success: false, message: `Estoque insuficiente para ${flavor}. Disponível: ${inventoryItem.quantity}, Necessário: ${change}` };
  }

  inventoryItem.quantity -= change;
  return { success: true };
}

// --- INVENTORY MANAGEMENT ---
export async function getInventory(): Promise<InventoryItem[]> {
  const { inventory } = await db.read();
  
  return inventory;
}

export async function updateInventory(updates: Partial<Record<SkewerFlavor, number>>): Promise<void> {
  const dbData = await db.read();
  (Object.entries(updates) as [SkewerFlavor, number][]).forEach(([flavor, quantity]) => {
    if (quantity !== undefined) {
      const item = dbData.inventory.find(inv => inv.flavor === flavor);
      // Only update the quantity if the flavor already exists in the inventory.
      if (item) {
        item.quantity = Math.max(0, quantity);
      }
      // If the flavor is not found, it is ignored, preventing new flavors from being added.
    }
  });
  await db.write(dbData);

  // Send update to external API
  try {
    await sendInventoryUpdate(updates);
  } catch (error) {
    console.error('Failed to send inventory update to external API:', error);
  }
}

// --- ORDER MANAGEMENT ---
export async function listOrders(): Promise<Order[]> {
  const { orders } = await db.read();
  return orders.map(order => ({
    ...order,
    // Only calculate status if it's still using old format
    status: ['todo', 'in_progress', 'done', 'canceled'].includes(order.status) 
      ? order.status 
      : calculateOrderStatus(order)
  }));
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const { orders } = await db.read();
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;
  return { 
    ...order, 
    // Only calculate status if it's still using old format
    status: ['todo', 'in_progress', 'done', 'canceled'].includes(order.status) 
      ? order.status 
      : calculateOrderStatus(order)
  };
}

export async function createOrder(
  customerName: string,
  items: Omit<OrderItem, 'id' | 'deliveredQty'>[]
): Promise<{ success: boolean; message?: string; order?: Order }> {
  const dbData = await db.read();

  // Adjust stock - collect all results first
  const inventoryAdjustmentResults: { success: boolean; message?: string }[] = [];
  for (const item of items) {
    if (item.type === 'skewer' && item.flavor) {
      const result = await adjustInventoryQuantity(dbData, item.flavor, item.qty);
      inventoryAdjustmentResults.push(result);
      if (!result.success) {
        // If any adjustment fails, return immediately without creating the order
        return { success: false, message: result.message };
      }
    }
  }

  const newOrder: Order = {
    id: generateId('local'),
    customerName,
    items: items.map(item => ({
      ...item,
      id: generateId('item'),
      deliveredQty: 0
    })),
    status: 'todo', // New orders start as 'todo'
    createdAt: new Date(),
    source: 'local'
  };

  dbData.orders.push(newOrder);
  await db.write(dbData); // Only write if all inventory adjustments were successful

  // Send to external API
  try {
    await sendCreateOrder(newOrder);
  } catch (error) {
    console.error('Failed to send new order to external API:', error);
  }

  return { success: true, order: newOrder };
}

export async function updateOrder(
  orderId: string,
  updates: {
    customerName?: string;
    items?: Omit<OrderItem, 'id' | 'deliveredQty'>[];
    status?: 'em_preparo' | 'entregue' | 'todo' | 'in_progress' | 'done' | 'canceled';
  }
): Promise<{ success: boolean; message?: string; order?: Order }> {
  const dbData = await db.read();
  const orderIndex = dbData.orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    return { success: false, message: 'Pedido não encontrado' };
  }

  const order = dbData.orders[orderIndex];

  // Handle item and inventory updates
  if (updates.items) {
    const stockChanges = new Map<SkewerFlavor, number>(); // flavor -> quantity change (+ve means take from stock, -ve means return to stock)

    // Calculate changes from old items
    order.items.forEach(oldItem => {
      if (oldItem.type === 'skewer' && oldItem.flavor) {
        const change = (stockChanges.get(oldItem.flavor) || 0) - oldItem.qty;
        stockChanges.set(oldItem.flavor, change);
      }
    });

    // Calculate changes from new items
    updates.items.forEach(newItem => {
      if (newItem.type === 'skewer' && newItem.flavor) {
        const change = (stockChanges.get(newItem.flavor) || 0) + newItem.qty;
        stockChanges.set(newItem.flavor, change);
      }
    });

    // Apply stock changes with validation
    for (const [flavor, qtyChange] of Array.from(stockChanges.entries())) {
      if (qtyChange !== 0) { // Only apply if there's a change
        const result = await adjustInventoryQuantity(dbData, flavor, qtyChange);
        if (!result.success) {
          // If stock is insufficient for a decrement, revert previous changes and return error
          // This is a simplified rollback. A more robust solution might involve a transaction system.
          for (const [prevFlavor, prevQtyChange] of Array.from(stockChanges.entries())) {
            if (prevFlavor === flavor) break; // Stop at the current flavor
            if (prevQtyChange !== 0) {
              await adjustInventoryQuantity(dbData, prevFlavor, -prevQtyChange); // Revert previous changes
            }
          }
          return { success: false, message: result.message };
        }
      }
    }

    // Update the order's items, preserving IDs and deliveredQty where possible
    order.items = updates.items.map(newItem => {
        const oldItem = order.items.find(oi => oi.flavor === newItem.flavor && oi.type === newItem.type && oi.beverage === newItem.beverage);
        return {
            ...newItem,
            id: oldItem?.id || generateId('item'),
            deliveredQty: oldItem?.deliveredQty || 0
        };
    });
  }

  // Update customer name
  if (updates.customerName) {
    order.customerName = updates.customerName;
  }

  // Update status only if explicitly provided
  if (updates.status) {
    order.status = updates.status;
  }
  // Do NOT recalculate status automatically to preserve Kanban state
  
  order.modified = true; // Mark as modified if any update occurs
  dbData.orders[orderIndex] = order;

  await db.write(dbData);

  // Send update to external API
  try {
    // Create external updates, excluding items if present to avoid type mismatch
    const { items: _, ...safeUpdates } = updates;
    const externalUpdates: Partial<Order> = {
      ...safeUpdates,
      ...(updates.items && { items: order.items }) // Use the complete items array if items were updated
    };
    await sendUpdateOrder(orderId, externalUpdates);
  } catch (error) {
    console.error('Failed to send order update to external API:', error);
  }

  return { success: true, order };
}

export async function deleteOrder(orderId: string): Promise<{ success: boolean; message?: string; order?: Order }> {
  const dbData = await db.read();
  const orderIndex = dbData.orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    return { success: false, message: 'Pedido não encontrado' };
  }

  const [deletedOrder] = dbData.orders.splice(orderIndex, 1);
  await db.write(dbData);

  // Send delete to external API
  try {
    await sendDeleteOrder(orderId);
  } catch (error) {
    console.error('Failed to send order deletion to external API:', error);
  }

  return { success: true, order: deletedOrder };
}

// --- ORDER ITEM MANAGEMENT ---
export async function updateOrderItem(
  orderId: string,
  itemId: string,
  updates: Partial<Pick<OrderItem, 'qty' | 'deliveredQty'>>
): Promise<{ success: boolean; message?: string; item?: OrderItem }> {
    const dbData = await db.read();
    const order = dbData.orders.find(o => o.id === orderId);

    if (!order) {
        return { success: false, message: 'Pedido não encontrado' };
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item) {
        return { success: false, message: 'Item não encontrado' };
    }

    // Handle inventory changes if quantity is updated
    if (updates.qty !== undefined && item.type === 'skewer' && item.flavor) {
        const qtyDifference = updates.qty - item.qty;
        if (qtyDifference !== 0) { // Only adjust if there's a change
            const result = await adjustInventoryQuantity(dbData, item.flavor, qtyDifference);
            if (!result.success) {
                return result; // Return error message from helper
            }
        }
    }

    if (updates.qty !== undefined) {
        item.qty = updates.qty;
    }
    if (updates.deliveredQty !== undefined) {
        if (updates.deliveredQty > item.qty) {
            return { success: false, message: 'Quantidade entregue não pode ser maior que a quantidade do item.' };
        }
        item.deliveredQty = updates.deliveredQty;
    }

    order.status = calculateOrderStatus(order);
    order.modified = true; // Mark as modified if any update occurs

    await db.write(dbData);

    // Send update to external API
    try {
        await sendUpdateOrderItem(orderId, itemId, updates);
    } catch (error) {
        console.error('Failed to send order item update to external API:', error);
    }

    return { success: true, item };
}

export async function deleteOrderItem(orderId: string, itemId: string): Promise<{ success: boolean; message?: string; item?: OrderItem }> {
    const dbData = await db.read();
    const order = dbData.orders.find(o => o.id === orderId);

    if (!order) {
        return { success: false, message: 'Pedido não encontrado' };
    }
    
    if (order.items.length <= 1) {
        return { success: false, message: 'Não é possível remover o último item de um pedido.' };
    }

    const itemIndex = order.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
        return { success: false, message: 'Item não encontrado' };
    }

    const [deletedItem] = order.items.splice(itemIndex, 1);

    // Restore inventory
    if (deletedItem.type === 'skewer' && deletedItem.flavor) {
        const result = await adjustInventoryQuantity(dbData, deletedItem.flavor, -deletedItem.qty); // Increment quantity
        if (!result.success) {
            console.error(`Failed to restore inventory for ${deletedItem.flavor}: ${result.message}`);
            // Decide how to handle this error: should deletion proceed if inventory can't be restored?
            // For now, we'll just log and proceed with deletion.
        }
    }

    order.status = calculateOrderStatus(order);
    order.modified = true; // Mark as modified if any update occurs

    await db.write(dbData);

    // Send delete to external API
    try {
        await sendDeleteOrderItem(orderId, itemId);
    } catch (error) {
        console.error('Failed to send order item deletion to external API:', error);
    }

    return { success: true, item: deletedItem };
}


// --- SYNC FUNCTIONS ---
export async function syncOrdersFromExternal(externalOrders: Order[]): Promise<void> {
  const dbData = await db.read();
  dbData.orders = externalOrders;
  await db.write(dbData);
}

export async function syncInventoryFromExternal(externalInventory: InventoryItem[]): Promise<void> {
  const dbData = await db.read();
  dbData.inventory = externalInventory;
  await db.write(dbData);
}

/**
 * External data fetching with Next.js caching and revalidation
 */

import { SkewerFlavor, Beverage, InventoryItem, Order, OrderItem } from './store';

// External API endpoints (configure via environment variables)
const EXTERNAL_INVENTORY_URL = process.env.EXTERNAL_INVENTORY_URL;
const EXTERNAL_PRODUCTS_URL = process.env.EXTERNAL_PRODUCTS_URL;
const EXTERNAL_ORDERS_URL = process.env.EXTERNAL_ORDERS_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;

// Default cache time: 5 minutes
const DEFAULT_REVALIDATE = 300;

// Function to normalize external flavor names to consistent format
function normalizeFlavorName(externalFlavor: string): SkewerFlavor {
  // Simply use the external flavor name as-is, just normalize whitespace
  return externalFlavor.trim();
}

// Function to parse items string from external orders
function parseOrderItems(itemsString: string): OrderItem[] {
  if (!itemsString || typeof itemsString !== 'string') {
    return [];
  }

  const items: OrderItem[] = [];
  const lines = itemsString.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Parse pattern like "pão de alho x 1" or "Carne x 2"
    const match = trimmedLine.match(/^(.+?)\s*x\s*(\d+)$/i);
    
    if (match) {
      const itemName = match[1].trim();
      const quantity = parseInt(match[2], 10) || 1;

      // Try to determine if it's a skewer or beverage
      // This is a simple heuristic - you might want to improve this based on your data
      const lowerItemName = itemName.toLowerCase();
      
      let type: 'skewer' | 'beverage' = 'skewer'; // default to skewer
      let flavor: string | undefined = itemName;
      let beverage: string | undefined = undefined;

      // Simple detection - can be improved based on your actual data patterns
      if (lowerItemName.includes('coca') || lowerItemName.includes('guaraná') || 
          lowerItemName.includes('água') || lowerItemName.includes('suco') ||
          lowerItemName.includes('bebida') || lowerItemName.includes('refrigerante')) {
        type = 'beverage';
        beverage = itemName;
        flavor = undefined;
      }

      items.push({
        id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        flavor,
        beverage,
        qty: quantity,
        deliveredQty: 0 // External orders start as not delivered
      });
    } else {
      // If pattern doesn't match, treat as skewer with qty 1
      items.push({
        id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'skewer',
        flavor: trimmedLine,
        qty: 1,
        deliveredQty: 0
      });
    }
  }

  return items;
}

// Function to map external status to internal status
function mapOrderStatus(externalStatus: string): 'em_preparo' | 'entregue' {
  const lowerStatus = externalStatus.toLowerCase().trim();
  
  if (lowerStatus.includes('entregue') || lowerStatus.includes('finalizado') || 
      lowerStatus.includes('concluído') || lowerStatus.includes('pronto')) {
    return 'entregue';
  }
  
  return 'em_preparo'; // default to preparing
}

interface ExternalInventoryItem {
  row_number: number;
  Espetinhos: string;
  "Quantidade Inicial": number;
  Estoque: number;
}

type ExternalInventoryResponse = ExternalInventoryItem[];

interface ExternalProductsResponse {
  skewerFlavors: string[];
  beverages: string[];
  lastUpdated: string;
  source: string;
}

interface ExternalOrderItem {
  row_number: number;
  Cliente: string;
  Itens: string;
  "Situação": string;
}

type ExternalOrdersResponse = ExternalOrderItem[];

/**
 * Fetches inventory data from external system with caching
 */
export async function fetchExternalInventory(): Promise<InventoryItem[] | null> {
  if (!EXTERNAL_INVENTORY_URL) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      // or headers['X-API-Key'] = API_KEY;
    }

    const response = await fetch(EXTERNAL_INVENTORY_URL, {
      headers,
      next: { 
        revalidate: DEFAULT_REVALIDATE,
        tags: ['external-inventory']
      }
    });

    if (!response.ok) {
      console.error(`External inventory API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const text = await response.text();
    if (!text.trim()) {
      console.log('External inventory API returned empty response');
      return [];
    }
    const data: ExternalInventoryResponse = JSON.parse(text);
    
    if (!Array.isArray(data)) {
      console.error('External inventory API returned unexpected format:', data);
      return null;
    }
    
    // Initialize inventory map to accumulate data
    const inventoryMap = new Map<SkewerFlavor, { quantity: number; initialQuantity: number }>();

    // Process each item from external API
    for (const item of data) {
      if (!item.Espetinhos || typeof item.Estoque !== 'number') {
        console.warn('Invalid inventory item from external API:', item);
        continue;
      }

      const normalizedFlavor = normalizeFlavorName(item.Espetinhos);
      const current = inventoryMap.get(normalizedFlavor) || { quantity: 0, initialQuantity: 0 };
      
      // Sum quantities if duplicate flavors exist
      inventoryMap.set(normalizedFlavor, {
        quantity: current.quantity + Math.max(0, item.Estoque),
        initialQuantity: current.initialQuantity + Math.max(0, item["Quantidade Inicial"] || 0)
      });
    }

    // Convert map to InventoryItem array
    const inventoryItems: InventoryItem[] = Array.from(inventoryMap.entries()).map(([flavor, data]) => ({
      flavor,
      quantity: data.quantity,
      initialQuantity: data.initialQuantity
    }));

    return inventoryItems;

  } catch (error) {
    console.error('Error fetching external inventory:', error);
    return null;
  }
}

/**
 * Fetches products data from external system with caching
 * Also can derive available flavors from inventory API if products API is not available
 */
export async function fetchExternalProducts(): Promise<{ flavors: SkewerFlavor[]; beverages: Beverage[] } | null> {
  // If no products URL, try to derive flavors from inventory
  if (!EXTERNAL_PRODUCTS_URL) {
    return await deriveProductsFromInventory();
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(EXTERNAL_PRODUCTS_URL, {
      headers,
      next: { 
        revalidate: DEFAULT_REVALIDATE,
        tags: ['external-products']
      }
    });

    if (!response.ok) {
      console.error(`External products API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const text = await response.text();
    if (!text.trim()) {
      console.log('External products API returned empty response');
      return null;
    }
    const data: ExternalProductsResponse = JSON.parse(text);
    
    // Use products as-is from external API, with minimal validation
    const flavors = data.skewerFlavors
      .filter(f => f && typeof f === 'string')
      .map(f => normalizeFlavorName(f));
    
    const beverages = data.beverages
      .filter(b => b && typeof b === 'string') as Beverage[];

    const result = {
      flavors: flavors.length > 0 ? flavors : ['Carne', 'Frango', 'Queijo', 'Calabresa'], // fallback
      beverages: beverages.length > 0 ? beverages : ['Coca-Cola', 'Guaraná', 'Água', 'Suco'] // fallback
    };

    return result;

  } catch (error) {
    console.error('Error fetching external products:', error);
    return null;
  }
}

/**
 * Combined fetch for all external data with fallbacks
 */
export async function fetchAllExternalData(): Promise<{
  inventory: InventoryItem[] | null;
  products: { flavors: SkewerFlavor[]; beverages: Beverage[] } | null;
  timestamp: Date;
}> {
  const [inventory, products] = await Promise.allSettled([
    fetchExternalInventory(),
    fetchExternalProducts()
  ]);

  return {
    inventory: inventory.status === 'fulfilled' ? inventory.value : null,
    products: products.status === 'fulfilled' ? products.value : null,
    timestamp: new Date()
  };
}

/**
 * Derives available flavors from inventory API when products API is not available
 */
async function deriveProductsFromInventory(): Promise<{ flavors: SkewerFlavor[]; beverages: Beverage[] } | null> {
  if (!EXTERNAL_INVENTORY_URL) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(EXTERNAL_INVENTORY_URL, {
      headers,
      next: { 
        revalidate: DEFAULT_REVALIDATE,
        tags: ['external-products-from-inventory']
      }
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text.trim()) {
      console.log('External inventory API returned empty response (products derivation)');
      return null;
    }
    const data: ExternalInventoryResponse = JSON.parse(text);
    
    if (!Array.isArray(data)) {
      return null;
    }

    // Extract unique flavors from inventory
    const flavorsSet = new Set<SkewerFlavor>();
    for (const item of data) {
      if (item.Espetinhos) {
        const normalizedFlavor = normalizeFlavorName(item.Espetinhos);
        flavorsSet.add(normalizedFlavor);
      }
    }

    const flavors = Array.from(flavorsSet);
    const beverages: Beverage[] = ['Coca-Cola', 'Guaraná', 'Água', 'Suco']; // Default beverages

    return { flavors, beverages };

  } catch (error) {
    console.error('Error deriving products from inventory:', error);
    return null;
  }
}

/**
 * Fetches orders data from external system with caching
 */
export async function fetchExternalOrders(): Promise<Order[] | null> {
  if (!EXTERNAL_ORDERS_URL) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(EXTERNAL_ORDERS_URL, {
      headers,
      next: { 
        revalidate: DEFAULT_REVALIDATE,
        tags: ['external-orders']
      }
    });

    if (!response.ok) {
      console.error(`External orders API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const text = await response.text();
    if (!text.trim()) {
      console.log('External orders API returned empty response');
      return [];
    }
    const data: ExternalOrdersResponse = JSON.parse(text);
    
    if (!Array.isArray(data)) {
      console.error('External orders API returned unexpected format:', data);
      return null;
    }
    
    // Process each order from external API
    const orders: Order[] = [];
    
    for (const externalOrder of data) {
      if (!externalOrder.Cliente || !externalOrder.Itens) {
        console.warn('Invalid order item from external API:', externalOrder);
        continue;
      }

      const parsedItems = parseOrderItems(externalOrder.Itens);
      if (parsedItems.length === 0) {
        console.warn('No valid items found in external order:', externalOrder);
        continue;
      }

      const order: Order = {
        id: `${externalOrder.row_number}`, // Use row_number directly as ID
        customerName: externalOrder.Cliente.trim(),
        items: parsedItems,
        status: mapOrderStatus(externalOrder["Situação"] || 'Em preparo'),
        createdAt: new Date(), // We don't have creation date from external API
        source: 'external',
        modified: false
      };

      orders.push(order);
    }

    return orders;

  } catch (error) {
    console.error('Error fetching external orders:', error);
    return null;
  }
}

/**
 * Utility to check if external APIs are configured
 */
export function isExternalDataConfigured(): {
  inventory: boolean;
  products: boolean;
  orders: boolean;
  hasApiKey: boolean;
} {
  return {
    inventory: !!EXTERNAL_INVENTORY_URL,
    products: !!EXTERNAL_PRODUCTS_URL,
    orders: !!EXTERNAL_ORDERS_URL,
    hasApiKey: !!API_KEY
  };
}

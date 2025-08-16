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
  if (!externalFlavor) return '';
  
  // Clean and normalize the flavor name
  let normalized = externalFlavor.trim();
  
  // Common corrections and normalizations
  const corrections: Record<string, string> = {
    'quejio': 'queijo',
    'quieijo': 'queijo',
    'qeuijo': 'queijo',
    'pao de alho': 'pão de alho',
    'pão de alho': 'pão de alho',
    'medalhao mandioca': 'medalhão mandioca',
    'medalhao frango': 'medalhão frango',
    'coracao': 'coração',
    'coração': 'coração'
  };
  
  const lowerNormalized = normalized.toLowerCase();
  
  // Apply corrections
  for (const [wrong, correct] of Object.entries(corrections)) {
    if (lowerNormalized.includes(wrong)) {
      return correct;
    }
  }
  
  return normalized;
}

// Function to parse items string from external orders
function parseOrderItems(itemsString: string, availableFlavors: SkewerFlavor[]): OrderItem[] {
  if (!itemsString || typeof itemsString !== 'string') {
    return [];
  }

  const items: OrderItem[] = [];
  // Try different separators: slash-separated (most common), newline-separated, or comma-separated
  let lines: string[] = [];
  
  if (itemsString.includes(' / ')) {
    lines = itemsString.split(' / ').filter(line => line.trim());
  } else if (itemsString.includes('/')) {
    lines = itemsString.split('/').filter(line => line.trim());
  } else if (itemsString.includes('\n')) {
    lines = itemsString.split('\n').filter(line => line.trim());
  } else if (itemsString.includes(',')) {
    lines = itemsString.split(',').filter(line => line.trim());
  } else {
    // Single item
    lines = [itemsString.trim()];
  }

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try to parse "Flavor x Qty" pattern first
    const match = trimmedLine.match(/^(.+?)\s*x\s*(\d+)$/i);
    
    if (match) {
      const itemName = match[1].trim();
      const quantity = parseInt(match[2], 10) || 1;
      const lowerItemName = itemName.toLowerCase();

      let type: 'skewer' | 'beverage' = 'skewer';
      let flavor: SkewerFlavor | undefined = undefined;
      let beverage: Beverage | undefined = undefined;

      // Check if it's a known beverage
      if (lowerItemName.includes('coca') || lowerItemName.includes('guaraná') || 
          lowerItemName.includes('água') || lowerItemName.includes('suco') ||
          lowerItemName.includes('bebida') || lowerItemName.includes('refrigerante')) {
        type = 'beverage';
        beverage = normalizeFlavorName(itemName); // Use normalizeFlavorName for beverages too
      } else {
        // Try to match against available flavors with flexible matching
        const normalizedItemName = normalizeFlavorName(itemName).toLowerCase();
        
        // First try exact match
        let matchedFlavor = availableFlavors.find(f => 
          normalizeFlavorName(f).toLowerCase() === normalizedItemName
        );
        
        // If no exact match, try partial matching
        if (!matchedFlavor) {
          matchedFlavor = availableFlavors.find(f => {
            const normalizedFlavor = normalizeFlavorName(f).toLowerCase();
            return normalizedItemName.includes(normalizedFlavor) || 
                   normalizedFlavor.includes(normalizedItemName);
          });
        }
        
        if (matchedFlavor) {
          flavor = matchedFlavor;
        } else {
          // Fallback: use the normalized name as-is
          flavor = normalizeFlavorName(itemName);
        }
      }

      items.push({
        id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        flavor,
        beverage,
        qty: quantity,
        deliveredQty: 0
      });
    } else {
      // If "Flavor x Qty" pattern doesn't match, try to find known flavors within the line
      let remainingLine = trimmedLine;
      let foundAnyFlavor = false;

      for (const knownFlavor of availableFlavors) {
        const normalizedKnownFlavor = normalizeFlavorName(knownFlavor);
        const regex = new RegExp(`(${normalizedKnownFlavor})\s*(?:x\s*(\d+))?`, 'gi'); // Match flavor and optional quantity
        let flavorMatch;
        while ((flavorMatch = regex.exec(remainingLine)) !== null) {
          foundAnyFlavor = true;
          const matchedFlavorName = flavorMatch[1];
          const matchedQty = parseInt(flavorMatch[2] || '1', 10);

          items.push({
            id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'skewer',
            flavor: normalizeFlavorName(matchedFlavorName),
            beverage: undefined,
            qty: matchedQty,
            deliveredQty: 0
          });
          // Remove the matched part from remainingLine to avoid re-matching
          remainingLine = remainingLine.replace(flavorMatch[0], '').trim();
          regex.lastIndex = 0; // Reset regex lastIndex for next iteration
        }
      }

      // Fallback for beverages if no skewer flavors were found in this complex line
      if (!foundAnyFlavor) {
        const lowerTrimmedLine = trimmedLine.toLowerCase();
        if (lowerTrimmedLine.includes('coca') || lowerTrimmedLine.includes('guaraná') || 
            lowerTrimmedLine.includes('água') || lowerTrimmedLine.includes('suco') ||
            lowerTrimmedLine.includes('bebida') || lowerTrimmedLine.includes('refrigerante')) {
          items.push({
            id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'beverage',
            flavor: undefined,
            beverage: normalizeFlavorName(trimmedLine),
            qty: 1,
            deliveredQty: 0
          });
        } else {
          // If still no match, treat the whole line as a single skewer item with qty 1
          items.push({
            id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'skewer',
            flavor: normalizeFlavorName(trimmedLine),
            qty: 1,
            deliveredQty: 0
          });
        }
      }
    }
  }
  return items;
}

// Function to map external status to internal Kanban status
function mapOrderStatus(externalStatus: any): 'todo' | 'in_progress' | 'done' | 'canceled' {
  if (typeof externalStatus !== 'string') {
    console.warn('Invalid external status received, expected string but got:', externalStatus);
    return 'in_progress';
  }
  const lowerStatus = externalStatus.toLowerCase().trim();
  
  // Map to Kanban statuses
  if (lowerStatus.includes('todo') || lowerStatus.includes('a fazer') || lowerStatus.includes('pendente')) {
    return 'todo';
  }
  
  if (lowerStatus.includes('entregue') || lowerStatus.includes('finalizado') || 
      lowerStatus.includes('concluído') || lowerStatus.includes('pronto') || lowerStatus.includes('done')) {
    return 'done';
  }
  
  if (lowerStatus.includes('cancelado') || lowerStatus.includes('canceled') || 
      lowerStatus.includes('cancelar') || lowerStatus.includes('rejeitado')) {
    return 'canceled';
  }
  
  // Default to in_progress for "Em preparo" and other preparing statuses
  return 'in_progress';
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
        flavors: flavors.length > 0 ? flavors : ['carne', 'frango', 'queijo', 'calabresa'].map(f => normalizeFlavorName(f)), // Fallback normalized
        beverages: beverages.length > 0 ? beverages : ['coca-cola', 'guaraná', 'água', 'suco'].map(b => normalizeFlavorName(b)) // Fallback normalized
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

    const flavors = Array.from(flavorsSet).map(f => normalizeFlavorName(f)); // Normalize here
    const beverages: Beverage[] = ['coca-cola', 'guaraná', 'água', 'suco'].map(b => normalizeFlavorName(b)); // Normalize here

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
    // Fetch products data first to get available flavors
    const productsData = await fetchExternalProducts();
    let availableFlavors: SkewerFlavor[] = [];
    if (productsData) {
      availableFlavors = productsData.flavors;
    } else {
      console.warn('Could not fetch products data for parsing external orders. Using fallback flavors.');
      // Fallback to default flavors if productsData cannot be fetched
      availableFlavors = ['Carne', 'Frango', 'Queijo', 'Calabresa'];
    }

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
    
    const orders: Order[] = [];
    
    for (const externalOrder of data) {
      if (!externalOrder.Cliente || !externalOrder.Itens) {
        console.warn('Invalid order item from external API:', externalOrder);
        continue;
      }

      // Pass availableFlavors to parseOrderItems
      const parsedItems = parseOrderItems(externalOrder.Itens, availableFlavors); 
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

/**
 * Sends inventory updates to external system
 */
export async function sendInventoryUpdate(updates: Partial<Record<SkewerFlavor, number>>): Promise<boolean> {
  if (!EXTERNAL_INVENTORY_URL) {
    console.warn('EXTERNAL_INVENTORY_URL is not configured. Inventory updates will not be sent to external API.');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(EXTERNAL_INVENTORY_URL, {
      method: 'PATCH', // Assuming PATCH for partial updates
      headers,
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      console.error(`Failed to send inventory update to external API: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log('Inventory update sent to external API successfully.');
    return true;

  } catch (error) {
    console.error('Error sending inventory update to external API:', error);
    return false;
  }
}

/**
 * Sends a new order to external system
 */
export async function sendCreateOrder(order: Order): Promise<boolean> {
  if (!EXTERNAL_ORDERS_URL) {
    console.warn('EXTERNAL_ORDERS_URL is not configured. New orders will not be sent to external API.');
    return false;
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
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      console.error(`Failed to send new order to external API: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log('New order sent to external API successfully.');
    return true;

  } catch (error) {
    console.error('Error sending new order to external API:', error);
    return false;
  }
}

/**
 * Sends an updated order to external system
 */
export async function sendUpdateOrder(orderId: string, updates: Partial<Order>): Promise<boolean> {
  if (!EXTERNAL_ORDERS_URL) {
    console.warn('EXTERNAL_ORDERS_URL is not configured. Order updates will not be sent to external API.');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(`${EXTERNAL_ORDERS_URL}/${orderId}`, {
      method: 'PUT', // Assuming PUT for full replacement or PATCH for partial
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      console.error(`Failed to send order update to external API: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`Order ${orderId} updated on external API successfully.`);
    return true;

  } catch (error) {
    console.error('Error sending order update to external API:', error);
    return false;
  }
}

/**
 * Sends a delete order request to external system
 */
export async function sendDeleteOrder(orderId: string): Promise<boolean> {
  if (!EXTERNAL_ORDERS_URL) {
    console.warn('EXTERNAL_ORDERS_URL is not configured. Order deletions will not be sent to external API.');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(`${EXTERNAL_ORDERS_URL}/${orderId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to send order deletion to external API: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`Order ${orderId} deleted on external API successfully.`);
    return true;

  } catch (error) {
    console.error('Error sending order deletion to external API:', error);
    return false;
  }
}

/**
 * Sends an updated order item to external system
 */
export async function sendUpdateOrderItem(orderId: string, itemId: string, updates: Partial<OrderItem>): Promise<boolean> {
  if (!EXTERNAL_ORDERS_URL) {
    console.warn('EXTERNAL_ORDERS_URL is not configured. Order item updates will not be sent to external API.');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    // Assuming a specific endpoint for item updates, or a PATCH to the order with item details
    // For simplicity, let's assume a PATCH to the order endpoint with the item ID in the body or URL
    // A more robust API would have a dedicated endpoint like /orders/{orderId}/items/{itemId}
    const response = await fetch(`${EXTERNAL_ORDERS_URL}/${orderId}/items/${itemId}`, {
      method: 'PATCH', // Assuming PATCH for partial item updates
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      console.error(`Failed to send order item update to external API: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`Order item ${itemId} for order ${orderId} updated on external API successfully.`);
    return true;

  } catch (error) {
    console.error('Error sending order item update to external API:', error);
    return false;
  }
}

/**
 * Sends a delete order item request to external system
 */
export async function sendDeleteOrderItem(orderId: string, itemId: string): Promise<boolean> {
  if (!EXTERNAL_ORDERS_URL) {
    console.warn('EXTERNAL_ORDERS_URL is not configured. Order item deletions will not be sent to external API.');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(`${EXTERNAL_ORDERS_URL}/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to send order item deletion to external API: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`Order item ${itemId} for order ${orderId} deleted on external API successfully.`);
    return true;

  } catch (error) {
    console.error('Error sending order item deletion to external API:', error);
    return false;
  }
}


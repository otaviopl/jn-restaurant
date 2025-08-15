/**
 * External data fetching with Next.js caching and revalidation
 */

import { SkewerFlavor, Beverage, InventoryItem } from './store';

// External API endpoints (configure via environment variables)
const EXTERNAL_INVENTORY_URL = process.env.EXTERNAL_INVENTORY_URL;
const EXTERNAL_PRODUCTS_URL = process.env.EXTERNAL_PRODUCTS_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;

// Default cache time: 5 minutes
const DEFAULT_REVALIDATE = 300;

// Function to normalize external flavor names to consistent format
function normalizeFlavorName(externalFlavor: string): SkewerFlavor {
  // Simply use the external flavor name as-is, just normalize whitespace
  return externalFlavor.trim();
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

/**
 * Fetches inventory data from external system with caching
 */
export async function fetchExternalInventory(): Promise<InventoryItem[] | null> {
  if (!EXTERNAL_INVENTORY_URL) {
    console.log('EXTERNAL_INVENTORY_URL not configured, using default inventory');
    return null;
  }

  try {
    console.log('Fetching inventory from external API:', EXTERNAL_INVENTORY_URL);
    
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

    const data: ExternalInventoryResponse = await response.json();
    
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
      
      console.log(`Processed flavor '${normalizedFlavor}': ${item.Estoque} current, ${item["Quantidade Inicial"]} initial`);
    }

    // Convert map to InventoryItem array
    const inventoryItems: InventoryItem[] = Array.from(inventoryMap.entries()).map(([flavor, data]) => ({
      flavor,
      quantity: data.quantity,
      initialQuantity: data.initialQuantity
    }));

    console.log('External inventory processed successfully:', inventoryItems);
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
    console.log('EXTERNAL_PRODUCTS_URL not configured, trying to derive from inventory');
    return await deriveProductsFromInventory();
  }

  try {
    console.log('Fetching products from external API:', EXTERNAL_PRODUCTS_URL);
    
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

    const data: ExternalProductsResponse = await response.json();
    
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

    console.log('External products fetched successfully:', result);
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
 * Fetch external data with shorter cache for real-time updates
 */
export async function fetchExternalInventoryRealtime(): Promise<InventoryItem[] | null> {
  if (!EXTERNAL_INVENTORY_URL) return null;

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
        revalidate: 30, // 30 seconds for real-time updates
        tags: ['external-inventory-realtime']
      }
    });

    if (!response.ok) return null;

    const data: ExternalInventoryResponse = await response.json();
    
    if (!Array.isArray(data)) {
      return null;
    }
    
    // Initialize inventory map
    const inventoryMap = new Map<SkewerFlavor, number>();

    // Process each item from external API
    for (const item of data) {
      if (!item.Espetinhos || typeof item.Estoque !== 'number') {
        continue;
      }

      const normalizedFlavor = normalizeFlavorName(item.Espetinhos);
      const currentQty = inventoryMap.get(normalizedFlavor) || 0;
      inventoryMap.set(normalizedFlavor, currentQty + Math.max(0, item.Estoque));
    }

    return Array.from(inventoryMap.entries()).map(([flavor, quantity]) => ({
      flavor,
      quantity
    }));

  } catch (error) {
    console.error('Error fetching realtime inventory:', error);
    return null;
  }
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

    const data: ExternalInventoryResponse = await response.json();
    
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

    console.log('Derived products from inventory:', { flavors, beverages });
    
    return { flavors, beverages };

  } catch (error) {
    console.error('Error deriving products from inventory:', error);
    return null;
  }
}

/**
 * Utility to check if external APIs are configured
 */
export function isExternalDataConfigured(): {
  inventory: boolean;
  products: boolean;
  hasApiKey: boolean;
} {
  return {
    inventory: !!EXTERNAL_INVENTORY_URL,
    products: !!EXTERNAL_PRODUCTS_URL,
    hasApiKey: !!API_KEY
  };
}

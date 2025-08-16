import { NextResponse } from 'next/server';
import { getAvailableFlavors, getAvailableBeverages, getLastSyncTime } from '@/lib/store';
import { fetchExternalProducts } from '@/lib/external-data';

export async function GET() {
  try {
    // Try to get external products first
    const externalProducts = await fetchExternalProducts();
    
    if (externalProducts) {
      // If we have external products, return them with sync info
      const lastSync = getLastSyncTime();
      return NextResponse.json({
        flavors: externalProducts.flavors,
        beverages: externalProducts.beverages,
        lastSync,
        lastSyncFormatted: lastSync?.toISOString(),
        dataSource: 'external'
      }, {
        headers: {
          'X-Data-Source': 'external',
          'X-Cache-Status': 'fresh'
        }
      });
    }
    
    // Fallback to locally stored flavors (derived from inventory sync)
    const flavors = getAvailableFlavors();
    const beverages = getAvailableBeverages();
    const lastSync = getLastSyncTime();
    
    return NextResponse.json({
      flavors: flavors.length > 0 ? flavors : ['Carne', 'Frango', 'Queijo', 'Calabresa'], // Ultimate fallback
      beverages: beverages.length > 0 ? beverages : ['Coca-Cola', 'Guaraná', 'Água', 'Suco'], // Ultimate fallback
      lastSync,
      lastSyncFormatted: lastSync?.toISOString(),
      dataSource: 'local'
    }, {
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'fallback'
      }
    });
  } catch (error) {
    console.error('Error in products GET:', error);
    
    // Always fallback to some products on error
    return NextResponse.json({
      flavors: ['Carne', 'Frango', 'Queijo', 'Calabresa'],
      beverages: ['Coca-Cola', 'Guaraná', 'Água', 'Suco'],
      lastSync: null,
      lastSyncFormatted: null,
      dataSource: 'error-fallback'
    }, {
      headers: {
        'X-Data-Source': 'error-fallback',
        'X-Cache-Status': 'error'
      }
    });
  }
}
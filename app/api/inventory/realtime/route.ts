import { NextResponse } from 'next/server';
import { fetchExternalInventoryRealtime } from '@/lib/external-data';
import { getInventory, syncInventoryFromWebhook, SkewerFlavor } from '@/lib/store';

// Short cache for real-time updates
export const revalidate = 30;

export async function GET() {
  try {
    // Try to get real-time external inventory
    const externalInventory = await fetchExternalInventoryRealtime();
    
    if (externalInventory) {
      // Sync external data to local store
      const updates: Partial<Record<SkewerFlavor, number>> = {};
      externalInventory.forEach(item => {
        updates[item.flavor] = item.quantity;
      });
      syncInventoryFromWebhook(updates);
      
      return NextResponse.json({
        inventory: externalInventory,
        source: 'external-realtime',
        timestamp: new Date().toISOString(),
        cacheTime: 30
      }, {
        headers: {
          'X-Data-Source': 'external-realtime',
          'X-Cache-Status': 'fresh',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      });
    }
    
    // Fallback to local inventory
    const inventory = getInventory();
    return NextResponse.json({
      inventory,
      source: 'local',
      timestamp: new Date().toISOString(),
      cacheTime: 0,
      warning: 'External API unavailable'
    }, {
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'fallback'
      }
    });
    
  } catch (error) {
    console.error('Error in realtime inventory:', error);
    
    const inventory = getInventory();
    return NextResponse.json({
      inventory,
      source: 'local',
      timestamp: new Date().toISOString(),
      error: 'External API error'
    }, {
      status: 200, // Don't fail, just fallback
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'error-fallback'
      }
    });
  }
}

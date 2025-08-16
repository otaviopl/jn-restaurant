import { NextResponse } from 'next/server';
import { fetchExternalInventory } from '@/lib/external-data'; // Import fetchExternalInventory
import { getInventory, syncInventoryFromExternal } from '@/lib/store'; // Import syncInventoryFromExternal

// Short cache for real-time updates
export const revalidate = 0; // Set revalidate to 0 to always fetch fresh data on demand

export async function GET() {
  try {
    // Try to get external inventory
    const externalInventory = await fetchExternalInventory();
    
    if (externalInventory) {
      // Sync external data to local store, overwriting db.json
      await syncInventoryFromExternal(externalInventory);
      
      const inventory = await getInventory(); // Get the updated inventory from the store

      return NextResponse.json({
        inventory: inventory,
        source: 'external-reloaded',
        timestamp: new Date().toISOString(),
        cacheTime: 0
      }, {
        headers: {
          'X-Data-Source': 'external-reloaded',
          'X-Cache-Status': 'fresh',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      });
    }
    
    // Fallback to local inventory if external fetch fails
    const inventory = await getInventory();
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
    console.error('Error in realtime inventory reload:', error);
    
    const inventory = await getInventory();
    return NextResponse.json({
      inventory,
      source: 'local',
      timestamp: new Date().toISOString(),
      error: 'External API error during reload'
    }, {
      status: 200, // Don't fail, just fallback
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'error-fallback'
      }
    });
  }
}

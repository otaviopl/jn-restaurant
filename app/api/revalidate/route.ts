import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { fetchExternalOrders, fetchExternalInventory } from '@/lib/external-data';
import { syncOrdersFromExternal, syncInventoryFromExternal } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags, forceSync } = body;

    // Revalidate the specified cache tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag);
      }
    }

    // If forceSync is true, fetch fresh data and sync to local database
    if (forceSync) {
      console.log('Force sync requested - fetching fresh data from external APIs');
      
      try {
        // Fetch fresh data from external APIs
        const [externalOrders, externalInventory] = await Promise.all([
          fetchExternalOrders(),
          fetchExternalInventory()
        ]);

        // Sync to local database
        if (externalOrders) {
          await syncOrdersFromExternal(externalOrders);
          console.log(`Synced ${externalOrders.length} orders from external API`);
        }

        if (externalInventory) {
          await syncInventoryFromExternal(externalInventory);
          console.log(`Synced ${externalInventory.length} inventory items from external API`);
        }

        return NextResponse.json({
          success: true,
          message: 'Cache revalidated and data synchronized successfully',
          synced: {
            orders: externalOrders?.length || 0,
            inventory: externalInventory?.length || 0
          }
        });

      } catch (syncError) {
        console.error('Error during force sync:', syncError);
        return NextResponse.json({
          success: false,
          message: 'Cache revalidated but sync failed',
          error: syncError instanceof Error ? syncError.message : 'Unknown sync error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated successfully',
      tags: tags || []
    });

  } catch (error) {
    console.error('Error in revalidate endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to revalidate cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
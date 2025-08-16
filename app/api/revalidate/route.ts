import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { fetchExternalInventory, fetchExternalOrders } from '@/lib/external-data';
import { syncInventoryFromExternal, syncOrdersFromExternal } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Invalidate the Next.js cache for external data.
    // This ensures that subsequent calls to fetchExternal... get fresh data.
    revalidateTag('external-inventory');
    revalidateTag('external-orders');
    revalidateTag('external-products');

    // Step 2: Fetch the latest data directly from the external APIs.
    const [inventory, orders] = await Promise.all([
      fetchExternalInventory(),
      fetchExternalOrders(),
    ]);

    // Step 3: Overwrite the local db.json with the fresh data.
    // This ensures the local database is a mirror of the external source of truth.
    if (inventory) {
      await syncInventoryFromExternal(inventory);
      console.log('Successfully synced inventory from external API.');
    }
    if (orders) {
      // We need a more robust sync for orders to not lose local modifications.
      // For now, we do a simple overwrite as requested.
      await syncOrdersFromExternal(orders);
      console.log('Successfully synced orders from external API.');
    }

    return NextResponse.json({
      success: true,
      revalidated: ['tag:external-inventory', 'tag:external-orders'],
      synced: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Revalidation and Sync error:', error);
    return NextResponse.json(
      { error: 'Erro ao revalidar e sincronizar dados' },
      { status: 500 }
    );
  }
}

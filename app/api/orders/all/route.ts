import { NextRequest, NextResponse } from 'next/server';
import { listOrders, syncOrdersFromExternal } from '@/lib/store';
import { fetchExternalOrders } from '@/lib/external-data';

export async function GET() {
  try {
    // Same as /api/orders - front-end is now mirror of external API
    const externalOrders = await fetchExternalOrders();
    
    if (externalOrders) {
      // Sync external data to local store (replaces all orders)
      syncOrdersFromExternal(externalOrders);
      
      return NextResponse.json(externalOrders, {
        headers: {
          'X-Data-Source': 'external',
          'X-Cache-Status': 'fresh',
          'X-Route-Note': 'same-as-orders-route'
        }
      });
    }
    
    // Fallback to local orders only if external API is down
    const orders = listOrders();
    return NextResponse.json(orders, {
      headers: {
        'X-Data-Source': 'local-fallback',
        'X-Cache-Status': 'external-unavailable'
      }
    });
  } catch (error) {
    console.error('Error in orders/all GET:', error);
    
    // Emergency fallback to local data
    const orders = listOrders();
    return NextResponse.json(orders, {
      headers: {
        'X-Data-Source': 'local-emergency',
        'X-Cache-Status': 'error-fallback'
      }
    });
  }
}

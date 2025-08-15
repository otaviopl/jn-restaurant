import { NextResponse } from 'next/server';
import { getProductsInfo, updateAvailableProducts } from '@/lib/store';
import { fetchExternalProducts } from '@/lib/external-data';

export async function GET() {
  try {
    // Try to get external products first
    const externalProducts = await fetchExternalProducts();
    
    if (externalProducts) {
      // Update local store with external data
      updateAvailableProducts(externalProducts.flavors, externalProducts.beverages);
      
      const updatedInfo = getProductsInfo();
      
      return NextResponse.json({
        ...updatedInfo,
        lastSyncFormatted: updatedInfo.lastSync ? updatedInfo.lastSync.toISOString() : null,
        isSynced: !!updatedInfo.lastSync,
        syncAge: updatedInfo.lastSync ? 
          Math.floor((Date.now() - updatedInfo.lastSync.getTime()) / 1000) : null,
        dataSource: 'external'
      }, {
        headers: {
          'X-Data-Source': 'external',
          'X-Cache-Status': 'fresh'
        }
      });
    }
    
    // Fallback to local products
    const productsInfo = getProductsInfo();
    
    return NextResponse.json({
      ...productsInfo,
      lastSyncFormatted: productsInfo.lastSync ? productsInfo.lastSync.toISOString() : null,
      isSynced: !!productsInfo.lastSync,
      syncAge: productsInfo.lastSync ? 
        Math.floor((Date.now() - productsInfo.lastSync.getTime()) / 1000) : null,
      dataSource: 'local'
    }, {
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'fallback'
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // Always fallback to local data on error
    const productsInfo = getProductsInfo();
    
    return NextResponse.json({
      ...productsInfo,
      lastSyncFormatted: productsInfo.lastSync ? productsInfo.lastSync.toISOString() : null,
      isSynced: !!productsInfo.lastSync,
      syncAge: productsInfo.lastSync ? 
        Math.floor((Date.now() - productsInfo.lastSync.getTime()) / 1000) : null,
      dataSource: 'local',
      error: 'External API unavailable'
    }, {
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'error-fallback'
      }
    });
  }
}

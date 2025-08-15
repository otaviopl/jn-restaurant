import { NextRequest, NextResponse } from 'next/server';
import { getInventory, updateInventory, syncInventoryFromWebhook, syncInventoryFromExternal, SkewerFlavor } from '@/lib/store';
import { sendWebhook, createInventoryWebhookPayload } from '@/lib/webhook';
import { fetchExternalInventory } from '@/lib/external-data';

export async function GET() {
  try {
    // Try to get external inventory first
    const externalInventory = await fetchExternalInventory();
    
    if (externalInventory) {
      // Sync external data to local store (complete replacement for dynamic flavors)
      syncInventoryFromExternal(externalInventory);
      
      return NextResponse.json(externalInventory, {
        headers: {
          'X-Data-Source': 'external',
          'X-Cache-Status': 'fresh'
        }
      });
    }
    
    // Fallback to local inventory
    const inventory = getInventory();
    return NextResponse.json(inventory, {
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'fallback'
      }
    });
  } catch (error) {
    console.error('Error in inventory GET:', error);
    
    // Always fallback to local data on error
    const inventory = getInventory();
    return NextResponse.json(inventory, {
      headers: {
        'X-Data-Source': 'local',
        'X-Cache-Status': 'error-fallback'
      }
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body.updates;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates de estoque são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate updates
    for (const [flavor, quantity] of Object.entries(updates)) {
      if (!flavor || typeof flavor !== 'string' || flavor.trim() === '') {
        return NextResponse.json(
          { error: `Sabor inválido: ${flavor}` },
          { status: 400 }
        );
      }

      if (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity)) {
        return NextResponse.json(
          { error: `Quantidade inválida para ${flavor}: deve ser um número inteiro não negativo` },
          { status: 400 }
        );
      }
    }

    updateInventory(updates);
    const updatedInventory = getInventory();
    
    // Send webhook notification for inventory update (non-blocking)
    const webhookPayload = createInventoryWebhookPayload(updates);
    sendWebhook(webhookPayload).catch(error => {
      console.error('Failed to send inventory.updated webhook:', error);
      // Don't fail the inventory update if webhook fails
    });
    
    return NextResponse.json(updatedInventory);
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

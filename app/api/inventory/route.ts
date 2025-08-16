import { NextRequest, NextResponse } from 'next/server';
import { getInventory, updateInventory, SkewerFlavor } from '@/lib/store';
import { sendWebhook, createInventoryWebhookPayload } from '@/lib/webhook';

// External inventory update endpoint
const EXTERNAL_INVENTORY_UPDATE_URL = process.env.EXTERNAL_INVENTORY_UPDATE_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;

/**
 * Send inventory update to external system
 */
async function sendInventoryUpdateToExternal(updates: Record<SkewerFlavor, number>): Promise<void> {
  if (!EXTERNAL_INVENTORY_UPDATE_URL) {
    console.log('EXTERNAL_INVENTORY_UPDATE_URL not configured, skipping external update');
    return;
  }

  try {
    console.log('Sending inventory update to external system with new format:', EXTERNAL_INVENTORY_UPDATE_URL);
    
    // Transform the updates object to the desired array format
    const payload = Object.entries(updates).map(([flavor, stock]) => ({
      "Espetinhos": flavor,
      "Estoque": stock
    }));
    
    console.log('Payload being sent:', JSON.stringify(payload, null, 2));
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(EXTERNAL_INVENTORY_UPDATE_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`External inventory update failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending inventory update to external system:', error);
  }
}

export async function GET() {
  try {
    const inventory = await getInventory();
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error in inventory GET:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
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

    await updateInventory(updates);
    const updatedInventory = await getInventory();
    
    // Non-blocking calls to external services
    sendInventoryUpdateToExternal(updates).catch(err => console.error('Failed to send inventory update to external system:', err));
    sendWebhook(createInventoryWebhookPayload(updates)).catch(err => console.error('Failed to send inventory.updated webhook:', err));
    
    return NextResponse.json(updatedInventory);
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

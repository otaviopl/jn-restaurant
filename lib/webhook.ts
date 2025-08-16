import { Order } from './store';

export interface WebhookPayload {
  event: 'order.created' | 'order.updated' | 'order.deleted' | 'inventory.updated';
  timestamp: string;
  data: any;
  metadata?: {
    source: string;
    version: string;
  };
}

/**
 * Sends data to configured webhook endpoint
 */
export async function sendWebhook(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const webhookTimeout = parseInt(process.env.WEBHOOK_TIMEOUT || '5000');

  if (!webhookUrl) {
    console.warn('WEBHOOK_URL not configured, skipping webhook call');
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhookTimeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    // Add webhook secret if configured
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
    }

    // Add signature for payload verification (simple HMAC-like approach)
    const payloadString = JSON.stringify(payload);
    if (webhookSecret) {
      const signature = await generateSignature(payloadString, webhookSecret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Webhook call failed: ${response.status} ${response.statusText}`, errorText);
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    console.log(`Webhook sent successfully: ${payload.event}`);
    return { success: true };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Webhook request timed out');
      return { success: false, error: 'Request timeout' };
    }

    console.error('Webhook error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generates a simple signature for webhook payload verification
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Use Web Crypto API if available (Node.js 16+)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Fallback for older environments
    return Buffer.from(payload + secret).toString('base64');
  }
}

/**
 * Creates webhook payload for order events
 */
export function createOrderWebhookPayload(
  event: 'order.created' | 'order.updated' | 'order.deleted',
  order: Order
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data: {
      order: {
        id: order.id,
        customerName: order.customerName,
        items: order.items.map(item => ({
          id: item.id,
          type: item.type,
          flavor: item.flavor,
          beverage: item.beverage,
          qty: item.qty,
          deliveredQty: item.deliveredQty,
        })),
        status: order.status,
        createdAt: order.createdAt,
        totalItems: order.items.reduce((sum, item) => sum + item.qty, 0),
        deliveredItems: order.items.reduce((sum, item) => sum + item.deliveredQty, 0),
      }
    },
    metadata: {
      source: 'jn-burger-backoffice',
      version: '1.0.0',
    }
  };
}

/**
 * Creates webhook payload for inventory events
 */
export function createInventoryWebhookPayload(
  inventoryUpdates: Record<string, number>
): WebhookPayload {
  return {
    event: 'inventory.updated',
    timestamp: new Date().toISOString(),
    data: {
      inventory: inventoryUpdates,
      updatedFlavors: Object.keys(inventoryUpdates),
      totalStock: Object.values(inventoryUpdates).reduce((sum, qty) => sum + qty, 0),
    },
    metadata: {
      source: 'jn-burger-backoffice',
      version: '1.0.0',
    }
  };
}

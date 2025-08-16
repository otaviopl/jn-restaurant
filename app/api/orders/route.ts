import { NextRequest, NextResponse } from 'next/server';
import { listOrders, createOrder, syncOrdersFromExternal } from '@/lib/store';
import { fetchExternalOrders } from '@/lib/external-data';
import { createOrderWebhookPayload, sendWebhook } from '@/lib/webhook';

export async function GET() {
  try {
    const externalOrders = await fetchExternalOrders();
    
    if (externalOrders) {
      syncOrdersFromExternal(externalOrders);
      
      return NextResponse.json(externalOrders, {
        headers: {
          'X-Data-Source': 'external',
          'X-Cache-Status': 'fresh',
          'X-Route-Note': 'synced-from-external'
        }
      });
    }
    
    const orders = await listOrders();
    return NextResponse.json(orders, {
      headers: {
        'X-Data-Source': 'local-fallback',
        'X-Cache-Status': 'external-unavailable'
      }
    });
  } catch (error) {
    console.error('Error in orders GET:', error);
    
    const orders = await listOrders();
    return NextResponse.json(orders, {
      headers: {
        'X-Data-Source': 'local-emergency',
        'X-Cache-Status': 'error-fallback'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, items } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { error: 'Nome do cliente é obrigatório' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Pelo menos um item deve ser adicionado ao pedido' },
        { status: 400 }
      );
    }

    // Basic item validation is good practice here, though the store also validates.
    for (const item of items) {
      if (!item.type || !['skewer', 'beverage'].includes(item.type)) {
        return NextResponse.json({ error: 'Tipo de item inválido' }, { status: 400 });
      }
      if (!item.qty || item.qty < 1) {
        return NextResponse.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 });
      }
    }

    const result = await createOrder(customerName.trim(), items);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Send webhook notification (non-blocking)
    if (result.order) {
      const webhookPayload = createOrderWebhookPayload('order.created', result.order);
      sendWebhook(webhookPayload).catch(error => {
        console.error('Failed to send order.created webhook:', error);
      });
    }

    return NextResponse.json(result.order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { listOrders, createOrder, SkewerFlavor, Beverage } from '@/lib/store';
import { sendWebhook, createOrderWebhookPayload } from '@/lib/webhook';

export async function GET() {
  try {
    const orders = listOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
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

    // Validate items
    for (const item of items) {
      if (!item.type || !['skewer', 'beverage'].includes(item.type)) {
        return NextResponse.json(
          { error: 'Tipo de item inválido' },
          { status: 400 }
        );
      }

      if (!item.qty || item.qty < 1) {
        return NextResponse.json(
          { error: 'Quantidade deve ser maior que zero' },
          { status: 400 }
        );
      }

      if (item.type === 'skewer' && !item.flavor) {
        return NextResponse.json(
          { error: 'Sabor do espetinho é obrigatório' },
          { status: 400 }
        );
      }

      if (item.type === 'beverage' && !item.beverage) {
        return NextResponse.json(
          { error: 'Tipo de bebida é obrigatório' },
          { status: 400 }
        );
      }
    }

    const result = createOrder(customerName.trim(), items);

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
        // Don't fail the order creation if webhook fails
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

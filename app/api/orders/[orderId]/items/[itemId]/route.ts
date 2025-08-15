import { NextRequest, NextResponse } from 'next/server';
import { updateDeliveredQty, getOrder } from '@/lib/store';
import { sendWebhook, createOrderWebhookPayload } from '@/lib/webhook';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const { orderId, itemId } = params;
    const body = await request.json();
    const { deliveredQty } = body;

    if (deliveredQty === undefined || deliveredQty === null) {
      return NextResponse.json(
        { error: 'Quantidade entregue é obrigatória' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(deliveredQty) || deliveredQty < 0) {
      return NextResponse.json(
        { error: 'Quantidade entregue deve ser um número inteiro não negativo' },
        { status: 400 }
      );
    }

    const result = updateDeliveredQty(orderId, itemId, deliveredQty);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Send webhook notification for order update (non-blocking)
    const updatedOrder = getOrder(orderId);
    if (updatedOrder) {
      const webhookPayload = createOrderWebhookPayload('order.updated', updatedOrder);
      sendWebhook(webhookPayload).catch(error => {
        console.error('Failed to send order.updated webhook:', error);
        // Don't fail the update if webhook fails
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating delivered quantity:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

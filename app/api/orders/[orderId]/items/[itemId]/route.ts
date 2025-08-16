import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrderItem, deleteOrderItem } from '@/lib/store';
import { sendWebhook, createOrderWebhookPayload } from '@/lib/webhook';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const { orderId, itemId } = params;
    const body = await request.json();

    // The new updateOrderItem can handle partial updates, including just deliveredQty
    const result = await updateOrderItem(orderId, itemId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Send webhook notification for order update (non-blocking)
    const updatedOrder = await getOrder(orderId);
    if (updatedOrder) {
      const webhookPayload = createOrderWebhookPayload('order.updated', updatedOrder);
      sendWebhook(webhookPayload).catch(error => {
        console.error('Failed to send order.updated webhook:', error);
      });
    }

    return NextResponse.json(result.item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const { orderId, itemId } = params;
    
    const result = await deleteOrderItem(orderId, itemId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Send webhook notification for order update (non-blocking)
    const updatedOrder = await getOrder(orderId);
    if (updatedOrder) {
      const webhookPayload = createOrderWebhookPayload('order.updated', updatedOrder);
      sendWebhook(webhookPayload).catch(error => {
        console.error('Failed to send order.updated webhook:', error);
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

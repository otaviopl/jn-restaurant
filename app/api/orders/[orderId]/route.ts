import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder, deleteOrder } from '@/lib/store';
import { sendWebhook, createOrderWebhookPayload } from '@/lib/webhook';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const order = await getOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();

    const result = await updateOrder(orderId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    if (result.order) {
      const webhookPayload = createOrderWebhookPayload('order.updated', result.order);
      sendWebhook(webhookPayload).catch(error => {
        console.error('Failed to send order.updated webhook:', error);
      });
    }

    return NextResponse.json(result.order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const result = await updateOrder(orderId, { status: body.status });
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    return NextResponse.json(result.order);
  } catch (error) {
    console.error('Error patching order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const result = await deleteOrder(orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      );
    }

    if (result.order) {
      const webhookPayload = createOrderWebhookPayload('order.deleted', result.order);
      sendWebhook(webhookPayload).catch(error => {
        console.error('Failed to send order.deleted webhook:', error);
      });
    }

    return new NextResponse(null, { status: 204 }); // Success, no content
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

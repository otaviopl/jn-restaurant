import { NextRequest, NextResponse } from 'next/server';
import { sendWebhook } from '@/lib/webhook';

export async function POST(request: NextRequest) {
  try {
    const { event, testData } = await request.json();

    if (!event) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    const webhookPayload = {
      event: event || 'test.event',
      timestamp: new Date().toISOString(),
      data: testData || {
        test: true,
        message: 'This is a test webhook from JN Burger Backoffice',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        source: 'jn-burger-backoffice',
        version: '1.0.0',
        isTest: true,
      }
    };

    const result = await sendWebhook(webhookPayload);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test webhook sent successfully',
        payload: webhookPayload
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: 'Failed to send test webhook'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const webhookUrl = process.env.WEBHOOK_URL;
  const hasSecret = !!process.env.WEBHOOK_SECRET;
  const timeout = process.env.WEBHOOK_TIMEOUT || '5000';

  return NextResponse.json({
    configured: !!webhookUrl,
    webhookUrl: webhookUrl ? `${webhookUrl.substring(0, 30)}...` : null,
    hasSecret,
    timeout: `${timeout}ms`,
    availableEvents: [
      'order.created',
      'order.updated', 
      'inventory.updated'
    ],
    externalDataConfig: {
      inventory: !!process.env.EXTERNAL_INVENTORY_URL,
      products: !!process.env.EXTERNAL_PRODUCTS_URL,
      hasApiKey: !!process.env.EXTERNAL_API_KEY
    }
  });
}
import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_ORDER_UPDATE_URL = process.env.EXTERNAL_ORDER_UPDATE_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    // The body now contains the full order object from the frontend
    const { row_number, customerName, items, status } = body;

    if (!row_number) {
      return NextResponse.json(
        { error: 'row_number é obrigatório' },
        { status: 400 }
      );
    }

    if (!EXTERNAL_ORDER_UPDATE_URL) {
      return NextResponse.json(
        { error: 'API externa não configurada' },
        { status: 503 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    // Convert items to the format expected by the external API
    let itemsString = '';
    if (items && Array.isArray(items)) {
      const formattedItems = items.map((item: any) => ({
        nome: item.type === 'skewer' ? item.flavor : item.beverage,
        quantidade: item.qty
      }));
      itemsString = JSON.stringify(formattedItems);
    }

    // Prepare payload for the external API
    const payload: Array<Record<string, any>> = [{
      row_number: row_number,
      itens: itemsString,
      cliente: customerName || undefined,
      situacao: status ? (status === 'em_preparo' ? 'Em preparo' : 'Entregue') : undefined
    }];

    console.log('Enviando atualização para API externa:', payload);

    const response = await fetch(EXTERNAL_ORDER_UPDATE_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido');
      console.error(`Erro na API externa: ${response.status} ${response.statusText}`, errorText);
      
      return NextResponse.json(
        { 
          error: 'Falha ao atualizar pedido na API externa',
          details: `${response.status}: ${response.statusText}`,
          externalError: errorText
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    console.log('Pedido atualizado com sucesso na API externa');
    
    return NextResponse.json({
      success: true,
      message: 'Pedido atualizado com sucesso na API externa',
      data: result
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


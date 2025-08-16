import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_ORDER_UPDATE_URL = process.env.EXTERNAL_ORDER_UPDATE_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { row_number, customerName, items, status } = body;

    if (!row_number) {
      return NextResponse.json(
        { error: 'row_number é obrigatório' },
        { status: 400 }
      );
    }

    // Se a URL externa não estiver configurada, retornar erro
    if (!EXTERNAL_ORDER_UPDATE_URL) {
      return NextResponse.json(
        { error: 'API externa não configurada' },
        { status: 503 }
      );
    }

    // Preparar headers para API externa
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JN-Burger-Backoffice/1.0.0',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    // Converter items para o formato esperado pela API externa
    let itemsString = '';
    if (items && Array.isArray(items)) {
      const formattedItems = items.map(item => ({
        nome: item.type === 'skewer' ? item.flavor : item.beverage,
        quantidade: item.qty
      }));
      itemsString = JSON.stringify(formattedItems);
    }

    // Preparar payload no formato esperado pela API externa
    const payload = [{
      row_number: row_number,
      itens: itemsString
    }];

    // Se outros campos forem fornecidos, adicionar ao payload
    if (customerName) {
      payload[0].cliente = customerName;
    }
    if (status) {
      payload[0].situacao = status === 'em_preparo' ? 'Em preparo' : 'Entregue';
    }

    console.log('Enviando atualização para API externa:', payload);

    // Usar PUT com row_number no body
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


import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_ORDER_DELETE_URL = process.env.EXTERNAL_ORDER_DELETE_URL;
const API_KEY = process.env.EXTERNAL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { row_number } = body;

    if (!row_number) {
      return NextResponse.json(
        { error: 'row_number é obrigatório' },
        { status: 400 }
      );
    }

    // Se a URL externa não estiver configurada, retornar erro
    if (!EXTERNAL_ORDER_DELETE_URL) {
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

    // Preparar payload para API externa
    const payload = { row_number };

    console.log('Enviando exclusão para API externa:', payload);

    // Enviar diretamente para API externa
    const response = await fetch(EXTERNAL_ORDER_DELETE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido');
      console.error(`Erro na API externa: ${response.status} ${response.statusText}`, errorText);
      
      return NextResponse.json(
        { 
          error: 'Falha ao excluir pedido na API externa',
          details: `${response.status}: ${response.statusText}`,
          externalError: errorText
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    console.log('Pedido excluído com sucesso na API externa');
    
    return NextResponse.json({
      success: true,
      message: 'Pedido excluído com sucesso na API externa',
      data: result
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


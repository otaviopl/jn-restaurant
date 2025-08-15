import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const { tags, paths, type } = await request.json();

    let revalidatedItems: string[] = [];

    // Revalidate specific tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag);
        revalidatedItems.push(`tag:${tag}`);
      }
    }

    // Revalidate specific paths
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path, type || 'page');
        revalidatedItems.push(`path:${path}`);
      }
    }

    // Default: revalidate external data
    if (!tags && !paths) {
      revalidateTag('external-inventory');
      revalidateTag('external-products');
      revalidatedItems.push('tag:external-inventory', 'tag:external-products');
    }

    return NextResponse.json({
      success: true,
      revalidated: revalidatedItems,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Erro ao revalidar cache' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'Manual cache revalidation endpoint',
    usage: {
      method: 'POST',
      body: {
        tags: ['external-inventory', 'external-products'],
        paths: ['/api/inventory', '/api/products'],
        type: 'page | layout'
      }
    },
    availableTags: [
      'external-inventory',
      'external-products',
      'external-inventory-realtime'
    ],
    availablePaths: [
      '/api/inventory',
      '/api/products',
      '/'
    ]
  });
}

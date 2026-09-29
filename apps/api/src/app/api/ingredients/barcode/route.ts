import { NextResponse } from 'next/server';
import type { BarcodeLookupRequest } from '@pantry-and-me/shared';
import { lookupBarcode, normalizeBarcode } from '@/lib/barcode-lookup';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BarcodeLookupRequest;
    const raw = typeof body.barcode === 'string' ? body.barcode : '';

    if (!raw) {
      return NextResponse.json({ error: 'Enter a barcode number to look up.' }, { status: 400 });
    }

    const barcode = normalizeBarcode(raw);

    if (!barcode) {
      return NextResponse.json(
        { error: 'That does not look like a product barcode.' },
        { status: 400 },
      );
    }

    const { provider, product } = await lookupBarcode(barcode);

    return NextResponse.json({ provider, product });
  } catch (error) {
    console.error('Barcode lookup failed:', error);
    return NextResponse.json({ error: 'Could not look up that barcode. Try again.' }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST { barcode } to look up a packaged product.',
  });
}

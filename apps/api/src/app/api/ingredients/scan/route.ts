import { NextResponse } from 'next/server';
import type { IngredientScanRequest } from '@pantry-and-me/shared';
import { scanIngredientPhoto, resolveIngredientScanProvider } from '@/lib/ingredient-scan';
import { liveProviderUnavailableMessage, mockProviderBlocked } from '@/lib/live-providers';
import { providerFailureResponse } from '@/lib/provider-errors';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Base64 inflates bytes by ~4/3, so this caps uploads near 6 MB of image data.
const MAX_BASE64_LENGTH = 8_000_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IngredientScanRequest;
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';

    if (!imageBase64) {
      return NextResponse.json({ error: 'That photo could not be read. Try again.' }, { status: 400 });
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'Image is too large. Retake the photo at a lower quality.' },
        { status: 413 },
      );
    }

    const mimeType =
      body.mimeType && ALLOWED_MIME_TYPES.includes(body.mimeType) ? body.mimeType : 'image/jpeg';

    if (mockProviderBlocked(resolveIngredientScanProvider())) {
      return NextResponse.json({ error: liveProviderUnavailableMessage('scan') }, { status: 503 });
    }

    const { provider, items } = await scanIngredientPhoto(imageBase64, mimeType);

    return NextResponse.json({ provider, items });
  } catch (error) {
    console.error('Ingredient scan failed:', error);
    const failure = providerFailureResponse(error, 'scan');
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST a base64 image to detect ingredients.',
  });
}

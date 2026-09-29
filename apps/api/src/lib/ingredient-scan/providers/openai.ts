import type { ScannedIngredient } from '@pantry-and-me/shared';

const DEFAULT_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You identify food items in photos of fridges, pantries, and grocery packaging.
Return only items you can actually see. Use short, searchable ingredient names ("greek yogurt", not "Chobani Plain Greek Yogurt 32oz").
Only include expirationDate when a date is legible in the image. Never guess a date.`;

const RESPONSE_INSTRUCTIONS = `Respond with JSON matching:
{"items":[{"name":string,"quantity":number|null,"unit":string|null,"expirationDate":"YYYY-MM-DD"|null,"confidence":number}]}
confidence is 0-1. Return {"items":[]} when no food is visible.`;

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function scanWithOpenAi(
  imageBase64: string,
  mimeType: string,
): Promise<ScannedIngredient[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? DEFAULT_MODEL,
      response_format: { type: 'json_object' },
      max_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: RESPONSE_INSTRUCTIONS },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' },
            },
          ],
        },
      ],
    }),
  });

  const data = (await response.json()) as OpenAiChatResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `OpenAI request failed with HTTP ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return [];
  }

  return parseScannedItems(content);
}

function parseScannedItems(content: string): ScannedIngredient[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Vision model returned malformed JSON.');
  }

  const rawItems = (parsed as { items?: unknown }).items;

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((entry) => normalizeItem(entry as Record<string, unknown>))
    .filter((item): item is ScannedIngredient => item !== null)
    .slice(0, 30);
}

function normalizeItem(entry: Record<string, unknown>): ScannedIngredient | null {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';

  if (!name) return null;

  const quantity = Number(entry.quantity);
  const confidence = Number(entry.confidence);
  const expirationDate =
    typeof entry.expirationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.expirationDate)
      ? entry.expirationDate
      : undefined;

  return {
    name: name.toLowerCase(),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
    unit: typeof entry.unit === 'string' && entry.unit.trim() ? entry.unit.trim() : undefined,
    expirationDate,
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.5,
  };
}

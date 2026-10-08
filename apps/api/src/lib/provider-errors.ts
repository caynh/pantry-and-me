export type ProviderFailureKind = 'rate_limit' | 'auth' | 'upstream';

export class ProviderRequestError extends Error {
  readonly kind: ProviderFailureKind;
  readonly status: number;

  constructor(message: string, status: number, kind: ProviderFailureKind) {
    super(message);
    this.name = 'ProviderRequestError';
    this.status = status;
    this.kind = kind;
  }
}

export function classifyProviderFailure(status: number, message: string): ProviderFailureKind {
  if (
    status === 429 ||
    /rate limit|too many requests|quota|insufficient_quota|exceeded your current quota|run out of searches/i.test(
      message,
    )
  ) {
    return 'rate_limit';
  }

  if (status === 401 || status === 403 || /invalid api key|incorrect api key|unauthorized/i.test(message)) {
    return 'auth';
  }

  return 'upstream';
}

/**
 * Upstream failures stay failures. Callers must not substitute mock recipes
 * or mock ingredients when OpenAI or SerpApi rejects a request.
 */
export function providerFailureResponse(
  error: unknown,
  feature: 'scan' | 'search',
): { status: number; error: string } {
  if (error instanceof ProviderRequestError && error.kind === 'rate_limit') {
    return {
      status: 503,
      error:
        feature === 'scan'
          ? 'Photo scanning is busy right now. Wait a minute and try again.'
          : 'Recipe search is busy right now. Wait a minute and try again.',
    };
  }

  return {
    status: 500,
    error:
      feature === 'scan'
        ? 'Ingredient scan did not finish. Try another photo.'
        : 'Recipe search failed. Try again in a moment.',
  };
}

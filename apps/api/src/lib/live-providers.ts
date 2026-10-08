export type LiveFeature = 'scan' | 'search';

/**
 * Production must not answer recipe search or photo scanning with sample data.
 * Local `next dev` stays on mock when keys are absent. Set REQUIRE_LIVE_PROVIDERS
 * to force either behavior.
 */
export function liveProvidersRequired(): boolean {
  const flag = process.env.REQUIRE_LIVE_PROVIDERS?.toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function mockProviderBlocked(provider: string): boolean {
  return liveProvidersRequired() && provider === 'mock';
}

export function liveProviderUnavailableMessage(feature: LiveFeature): string {
  return feature === 'scan'
    ? 'Photo scanning is temporarily unavailable. Try again later.'
    : 'Recipe search is temporarily unavailable. Try again later.';
}

import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropic(apiKey: string): Anthropic {
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

/**
 * Cheapest Anthropic tier — translation doesn't need the smartest model
 * and cost matters because we fan out 9 locales × ~10 articles/day.
 */
export const TRANSLATE_MODEL = 'claude-haiku-4-5';

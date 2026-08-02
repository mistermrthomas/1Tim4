import OpenAI from 'openai';

/** Server-only OpenAI client. Never import from client bundles. */
export function createOpenAIClient(apiKey = process.env.OPENAI_API_KEY): OpenAI | null {
  if (!apiKey?.trim()) return null;
  return new OpenAI({ apiKey: apiKey.trim() });
}

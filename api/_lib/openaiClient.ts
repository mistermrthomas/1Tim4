import OpenAI from 'openai';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

/**
 * Server-only OpenAI-compatible client.
 *
 * Supports:
 * - Direct OpenAI keys (`sk-…`) via api.openai.com
 * - Vercel AI Gateway keys (`vck-…`) via ai-gateway.vercel.sh
 * - Optional `OPENAI_BASE_URL` override
 * - `AI_GATEWAY_API_KEY` as an alternate env name for gateway keys
 *
 * Never import from client bundles.
 */
export function createOpenAIClient(): OpenAI | null {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = gatewayKey || openAiKey;
  if (!apiKey) return null;

  const explicitBase = process.env.OPENAI_BASE_URL?.trim();
  const looksLikeGatewayKey = apiKey.startsWith('vck_') || Boolean(gatewayKey);
  const baseURL = explicitBase || (looksLikeGatewayKey ? GATEWAY_BASE_URL : undefined);

  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export function resolveOpenAIModelId(model: string): string {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = gatewayKey || openAiKey || '';
  const usingGateway =
    Boolean(process.env.OPENAI_BASE_URL?.trim()) ||
    Boolean(gatewayKey) ||
    apiKey.startsWith('vck_');

  // Gateway prefers provider-prefixed model ids.
  if (usingGateway && !model.includes('/')) {
    return `openai/${model}`;
  }
  return model;
}

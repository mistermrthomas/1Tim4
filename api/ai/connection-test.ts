import { resolveSermonPlanModel } from '../../shared/aiModels';
import { createOpenAIClient, resolveOpenAIModelId } from '../_lib/openaiClient';

type VercelRequest = { method?: string };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ status: 'failed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const client = createOpenAIClient();
  if (!client) {
    res.status(503).json({ status: 'missing_configuration', code: 'MISSING_CONFIGURATION' });
    return;
  }

  const model = resolveOpenAIModelId(resolveSermonPlanModel(null, process.env.OPENAI_MODEL));
  const usingGateway = Boolean(client.baseURL?.includes('ai-gateway.vercel.sh'));

  try {
    // Minimal, low-cost probe — not a full sermon plan generation.
    const response = await client.responses.create({
      model,
      max_output_tokens: 16,
      input: 'Reply with the single word: ok',
    });
    const text = typeof response.output_text === 'string' ? response.output_text : '';
    if (!text && !response.id) {
      res.status(502).json({ status: 'failed', code: 'CONNECTION_FAILED' });
      return;
    }
    res.status(200).json({
      status: 'connected',
      model,
      via: usingGateway ? 'vercel-ai-gateway' : 'openai',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('ai connection-test failed', message.slice(0, 160));
    if (/\b429\b|rate.?limit/i.test(message)) {
      res.status(429).json({ status: 'failed', code: 'RATE_LIMIT' });
      return;
    }
    // Common misconfig: gateway key sent to api.openai.com (or invalid key).
    if (/incorrect api key|invalid.?api.?key|401|unauthorized/i.test(message)) {
      res.status(502).json({
        status: 'failed',
        code: 'AUTH_FAILED',
      });
      return;
    }
    res.status(502).json({ status: 'failed', code: 'CONNECTION_FAILED' });
  }
}

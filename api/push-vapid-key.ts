import { cors, getVapidPublicKey, type VercelRequest, type VercelResponse } from './_lib/pushEnv.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    res.status(503).json({ error: 'Push notifications are not configured on this server.' });
    return;
  }

  res.status(200).json({ publicKey });
}

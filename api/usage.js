async function getClerkUserId(token) {
  const res = await fetch('https://generous-catfish-11.clerk.accounts.dev/oauth/userinfo', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sub || null;
}

const LIMIT = 3;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'missing_token' });
  }
  const token = authHeader.slice(7);

  const userId = await getClerkUserId(token);
  if (userId === null) {
    return res.status(401).json({ error: 'Unauthorized', code: 'invalid_token' });
  }

  const key = `briefs:${userId}`;
  const { action } = req.query;

  if (action === 'check' && req.method === 'GET') {
    const response = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    const data = await response.json();
    const count = data.result !== null ? Number(data.result) : 0;
    return res.status(200).json({ count, limit: LIMIT, allowed: count < LIMIT });
  }

  if (action === 'increment' && req.method === 'POST') {
    const response = await fetch(`${process.env.KV_REST_API_URL}/incr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    const data = await response.json();
    const count = Number(data.result);
    return res.status(200).json({ count, limit: LIMIT, allowed: count < LIMIT });
  }

  return res.status(400).json({ error: 'Invalid action or method' });
}

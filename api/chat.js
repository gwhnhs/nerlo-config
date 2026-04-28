async function getClerkUserId(token) {
  const res = await fetch('https://generous-catfish-11.clerk.accounts.dev/oauth/userinfo', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sub || null;
}

export default async function handler(req, res) {
  // CORS headers — allow requests from the extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'missing_token' });
  }
  const token = authHeader.slice(7);
  const userId = await getClerkUserId(token);
  if (userId === null) {
    return res.status(401).json({ error: 'Unauthorized', code: 'invalid_token' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

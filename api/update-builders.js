import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const BUILDERS = {
  Lovable: 'https://lovable.dev/pricing',
  Bolt: 'https://bolt.new',
  Replit: 'https://replit.com/pricing',
  Base44: 'https://base44.com/pricing',
  v0: 'https://v0.dev/pricing',
  Cursor: 'https://cursor.com/pricing',
};

const SYSTEM_PROMPT = `You analyze a builder platform's features page and extract what it handles natively vs what requires external accounts.

Respond with ONLY valid JSON in this exact format, no other text:
{
  "nativeCapabilities": ["database", "auth", "hosting", "email", "sms", "payments", "file storage"],
  "externalServices": {
    "payments": "Plain English explanation of why the user needs a separate account for this.",
    "email": "Plain English explanation."
  }
}

nativeCapabilities: list only what the platform genuinely handles with zero external account needed.
externalServices: list only what requires the user to set up a separate third-party account.
Never include hosting, deployment, or geolocation as external services.
Keep explanations under 20 words, friendly tone.`;

export default async function handler(req, res) {
  if (req.headers['authorization'] !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {};

  for (const [builder, url] of Object.entries(BUILDERS)) {
    try {
      const page = await fetch(url).then(r => r.text());
      const truncated = page.slice(0, 8000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: 'Builder: ' + builder + '\n\nPage content:\n' + truncated }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        results[builder] = JSON.parse(text.slice(start, end + 1));
      }
    } catch {
      // Skip this builder on error — keep the rest
    }
  }

  if (Object.keys(results).length > 0) {
    await redis.set('nerlo:builders:config', { builders: results });
  }

  return res.status(200).json({ updated: Object.keys(results), timestamp: new Date().toISOString() });
}

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  try {
    const cached = await redis.get('nerlo:builders:config');
    if (cached) {
      return res.status(200).json(cached);
    }
  } catch {
    // Redis unavailable — fall through to static fallback
  }

  // Static fallback — mirrors builders.json
  const fallback = await fetch(new URL('../builders.json', import.meta.url))
    .then(r => r.json())
    .catch(() => ({ builders: {} }));

  return res.status(200).json(fallback);
}

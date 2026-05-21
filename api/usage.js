const VALID_EVENTS = new Set(['brief', 'image', 'audio_music', 'audio_sfx', 'audio_voice']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  if (action === 'stats' && req.method === 'GET') {
    try {
      const keys = ['total', 'brief', 'image', 'audio_music', 'audio_sfx', 'audio_voice'];
      const results = await Promise.all(keys.map(k =>
        fetch(`${process.env.KV_REST_API_URL}/get/count:${k}`, {
          headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
        }).then(r => r.json()).then(d => Number(d.result) || 0)
      ));
      const [total, brief, image, audio_music, audio_sfx, audio_voice] = results;
      return res.status(200).json({ total, brief, image, audio_music, audio_sfx, audio_voice });
    } catch (err) {
      return res.status(500).json({ error: 'failed to fetch stats' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    const { event } = JSON.parse(raw);

    if (!event || !VALID_EVENTS.has(event)) {
      return res.status(400).json({ error: 'invalid event' });
    }

    const [eventRes, totalRes] = await Promise.all([
      fetch(`${process.env.KV_REST_API_URL}/incr/count:${event}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      }),
      fetch(`${process.env.KV_REST_API_URL}/incr/count:total`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      })
    ]);

    const eventData = await eventRes.json();
    if (!eventRes.ok) throw new Error('redis error');

    return res.status(200).json({ ok: true, event, count: Number(eventData.result) });
  } catch (err) {
    return res.status(500).json({ error: 'failed to record event' });
  }
}

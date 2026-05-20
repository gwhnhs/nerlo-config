export const config = { maxDuration: 60 };

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    const { type, prompt, voice_id } = JSON.parse(raw);

    let response;
    if (type === 'sfx') {
      response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: null,
          prompt_influence: 0.3
        })
      });
    } else if (type === 'voice') {
      const vid = voice_id || DEFAULT_VOICE_ID;
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: prompt,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
    } else {
      return res.status(400).json({ error: 'invalid type' });
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'no audio returned' });
    }

    const buffer = await response.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return res.status(502).json({ error: 'no audio returned' });
    }

    const base64 = Buffer.from(buffer).toString('base64');
    res.status(200).json({ audio: base64, contentType: 'audio/mpeg' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

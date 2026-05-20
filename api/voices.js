export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    });
    if (!response.ok) {
      return res.status(502).json({ error: 'failed to fetch voices' });
    }
    const data = await response.json();
    const voices = Array.isArray(data.voices) ? data.voices : [];
    const filtered = voices.filter(v => {
      const useCase = v.labels?.use_case;
      const age = v.labels?.age;
      return useCase !== 'characters' && age !== 'old';
    });
    const simplified = filtered.map(v => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender,
      description: v.labels?.description,
      use_case: v.labels?.use_case,
      preview_url: v.preview_url
    }));
    simplified.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.status(200).json(simplified);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

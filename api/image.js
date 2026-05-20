export const config = { maxDuration: 60 };

const SIZE_MAP = {
  '1:1':  { width: 1024, height: 1024 },
  '9:16': { width: 768,  height: 1344 },
  '16:9': { width: 1344, height: 768  },
  '2:3':  { width: 832,  height: 1248 }
};

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
    const { prompt, ar } = JSON.parse(raw);
    const image_size = SIZE_MAP[ar] || SIZE_MAP['1:1'];
    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, image_size, num_images: 1 })
    });
    const data = await response.json();
    const url = data?.images?.[0]?.url;
    if (!url) return res.status(502).json({ error: 'no image returned' });
    res.status(200).json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

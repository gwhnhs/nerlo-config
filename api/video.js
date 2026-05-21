export const config = { maxDuration: 60 };

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
    const { action, prompt, ratio, duration, taskId } = JSON.parse(raw);

    if (action === 'submit') {
      const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify({
          promptText: prompt,
          ratio: ratio || '1280:720',
          duration: duration || 5,
          model: 'gen4.5'
        })
      });
      const data = await response.json();
      if (!data.id) return res.status(502).json({ error: data.error || 'submission failed' });
      return res.status(200).json({ taskId: data.id });
    }

    if (action === 'poll') {
      const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
          'X-Runway-Version': '2024-11-06'
        }
      });
      const data = await response.json();
      if (data.status === 'SUCCEEDED') {
        return res.status(200).json({ status: 'succeeded', url: data.output[0] });
      }
      if (data.status === 'FAILED') {
        return res.status(200).json({ status: 'failed', error: data.failure || 'generation failed' });
      }
      return res.status(200).json({ status: (data.status || 'pending').toLowerCase() });
    }

    return res.status(400).json({ error: 'invalid action' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

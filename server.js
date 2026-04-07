const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'Flat Fancy backend running OK' });
});

// Claude proxy
app.post('/analyse', async (req, res) => {
  const apiKey = req.headers['x-claude-key'];
  if (!apiKey) return res.status(400).json({ error: 'No Claude API key provided' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replicate proxy - start prediction
// Uses adirik/interior-design with lower prompt_strength to preserve original room
app.post('/render/start', async (req, res) => {
  const rKey = req.headers['x-replicate-key'];
  if (!rKey) return res.status(400).json({ error: 'No Replicate key provided' });
  try {
    const input = req.body.input || {};
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
        input: {
          image: input.image,
          prompt: input.prompt,
          negative_prompt: input.negative_prompt || 'changing wall colour, removing furniture, adding furniture, unrealistic, deformed, blurry, watermark, text, cartoon, changing carpet, changing curtains',
          guidance_scale: input.guidance_scale || 7,
          prompt_strength: input.prompt_strength || 0.6,
          num_inference_steps: input.num_inference_steps || 30
        }
      })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replicate proxy - poll prediction
app.get('/render/poll/:id', async (req, res) => {
  const rKey = req.headers['x-replicate-key'];
  if (!rKey) return res.status(400).json({ error: 'No Replicate key provided' });
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${rKey}` }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flat Fancy backend running on port ${PORT}`));

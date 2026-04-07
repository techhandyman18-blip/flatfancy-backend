const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Keys come from Render environment variables — never exposed to browser
const CLAUDE_KEY = process.env.CLAUDE_KEY;
const REPLICATE_KEY = process.env.REPLICATE_KEY;

app.get('/', (req, res) => {
  res.json({ 
    status: 'Flat Fancy backend running OK',
    claude: CLAUDE_KEY ? 'configured' : 'MISSING',
    replicate: REPLICATE_KEY ? 'configured' : 'MISSING'
  });
});

// Claude — uses server-side key, browser sends no key
app.post('/analyse', async (req, res) => {
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key not configured on server. Add CLAUDE_KEY to Render environment variables.' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
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

// Replicate start — uses server-side key
app.post('/render/start', async (req, res) => {
  if (!REPLICATE_KEY) return res.status(500).json({ error: 'Replicate token not configured on server. Add REPLICATE_KEY to Render environment variables.' });
  try {
    const input = req.body.input || {};
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
        input: {
          image: input.image,
          prompt: input.prompt,
          negative_prompt: input.negative_prompt || 'changing wall colour, removing furniture, painting walls, unrealistic, deformed, blurry, watermark',
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

// Replicate poll — uses server-side key
app.get('/render/poll/:id', async (req, res) => {
  if (!REPLICATE_KEY) return res.status(500).json({ error: 'Replicate token not configured.' });
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_KEY}` }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flat Fancy backend running on port ${PORT}`));

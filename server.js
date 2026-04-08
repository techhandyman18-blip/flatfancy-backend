const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const CLAUDE_KEY = process.env.CLAUDE_KEY;
const REPLICATE_KEY = process.env.REPLICATE_KEY;

app.get('/', (req, res) => {
  res.json({
    status: 'Flat Fancy backend running OK',
    claude: CLAUDE_KEY ? 'configured' : 'MISSING',
    replicate: REPLICATE_KEY ? 'configured' : 'MISSING'
  });
});

// Claude proxy
app.post('/analyse', async (req, res) => {
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key not configured.' });
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

// Render - using adirik/interior-design
// prompt_strength 0.45 = visible styling changes while keeping room structure
app.post('/render/start', async (req, res) => {
  if (!REPLICATE_KEY) return res.status(500).json({ error: 'Replicate token not configured.' });
  try {
    const input = req.body.input || {};

    const body = {
      version: "76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
      input: {
        image: input.image,
        prompt: input.prompt,
        negative_prompt: "cartoon, painting, illustration, deformed, blurry, low quality, watermark, text, ugly, unrealistic",
        guidance_scale: 12,
        prompt_strength: 0.45,
        num_inference_steps: 35
      }
    };

    console.log('Starting Replicate prediction...');

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('Replicate response:', JSON.stringify(data).slice(0, 300));

    // Return the full response so frontend can debug
    res.status(response.status).json(data);

  } catch (err) {
    console.error('Render error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Poll render
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

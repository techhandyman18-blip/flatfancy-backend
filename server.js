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
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key not configured. Add CLAUDE_KEY to Render environment variables.' });
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

// Replicate render - using img2img with very low strength to preserve room
// Model: stability-ai/sdxl with img2img - best for subtle room changes
app.post('/render/start', async (req, res) => {
  if (!REPLICATE_KEY) return res.status(500).json({ error: 'Replicate token not configured.' });
  try {
    const input = req.body.input || {};

    // Use SDXL img2img - much better at preserving original room structure
    // prompt_strength 0.35 = only 35% change, keeps 65% of original
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        input: {
          image: input.image,
          prompt: input.prompt,
          negative_prompt: "changing walls, painting walls, different wall color, removing furniture, replacing furniture, new furniture, unrealistic, cartoon, illustration, deformed, blurry, low quality, watermark, text, logo",
          strength: 0.35,
          guidance_scale: 7.5,
          num_inference_steps: 30,
          scheduler: "K_EULER"
        }
      })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
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

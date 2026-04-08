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

// Render using instruct-pix2pix
// This model takes INSTRUCTIONS on an existing photo — minimal changes, preserves room
// "add white bedding" = adds bedding only, keeps everything else identical
app.post('/render/start', async (req, res) => {
  if (!REPLICATE_KEY) return res.status(500).json({ error: 'Replicate token not configured.' });
  try {
    const input = req.body.input || {};

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // instruct-pix2pix: best model for applying minimal edits to real photos
        version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23d",
        input: {
          image: input.image,
          // Instruction format: tell it WHAT to add, not describe the whole room
          prompt: input.prompt,
          negative_prompt: "changing wall color, painting walls, removing existing furniture, replacing furniture, new furniture added, different room, cartoon, painting, illustration, unrealistic, deformed, low quality",
          // image_guidance_scale: how closely to follow the original image
          // Higher = more faithful to original (1.0-2.5 range, we want 1.8)
          image_guidance_scale: 1.8,
          // guidance_scale: how closely to follow the text instruction
          // Lower = more subtle changes (5-10 range, we want 6)
          guidance_scale: 6,
          num_inference_steps: 30
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

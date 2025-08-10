const express = require('express');
const fetch = require('node-fetch'); // For Node 18+, you can use global fetch
const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain for production
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Proxy license requests
app.all('/proxy-license', async (req, res) => {
  try {
    const target = req.query.target;
    if (!target) return res.status(400).send('Missing target URL');

    const forwardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT; Win64; x64)',
      'Accept': '*/*',
      'Connection': 'keep-alive'
    };

    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

    const upstream = await fetch(target, {
      method: req.method,
      headers: forwardHeaders,
      body: body.length ? body : undefined,
      redirect: 'follow'
    });

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-length') {
        res.setHeader(key, value);
      }
    });

    res.status(upstream.status);
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`License proxy running on port ${PORT}`);
});

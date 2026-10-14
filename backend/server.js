import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

import {
  convertJsonToToonUtil,
  convertToonToJsonUtil,
  queryDataWithGeminiUtil,
  streamQueryDataWithGeminiUtil,
  checkApiKeys,
  countTokens,
} from './utils.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://toon-optimizer.vercel.app',
];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or matched origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, origins configured via env
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Gemini-API-Key', 'X-LangSmith-API-Key', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));

// 1. Root and Health endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Lexa Studio - Token Efficiency API', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// 2. Status endpoint (check API keys)
app.get('/api/status', (req, res) => {
  const geminiKey = req.headers['x-gemini-api-key'] || null;
  const langsmithKey = req.headers['x-langsmith-api-key'] || null;

  const status = checkApiKeys(geminiKey, langsmithKey);
  res.json(status);
});

// 3. Convert JSON to TOON
app.post('/api/convert/json-to-toon', (req, res) => {
  try {
    const { json_input, indent = 2, delimiter = ',' } = req.body;

    if (!json_input || typeof json_input !== 'string' || !json_input.trim()) {
      return res.status(400).json({ detail: 'json_input is required and cannot be empty' });
    }

    if (![',', '\t', '|'].includes(delimiter)) {
      return res.status(400).json({ detail: 'Delimiter must be one of: , \\t |' });
    }

    const indentNum = Number(indent);
    if (isNaN(indentNum) || indentNum < 1 || indentNum > 8) {
      return res.status(400).json({ detail: 'Indent must be between 1 and 8' });
    }

    const result = convertJsonToToonUtil(json_input, indentNum, delimiter);
    return res.json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ detail: `Invalid JSON: ${err.message}` });
    }
    return res.status(500).json({ detail: `Error: ${err.message}` });
  }
});

// 4. Convert TOON to JSON
app.post('/api/convert/toon-to-json', (req, res) => {
  try {
    const { toon_input } = req.body;

    if (!toon_input || typeof toon_input !== 'string' || !toon_input.trim()) {
      return res.status(400).json({ detail: 'toon_input is required and cannot be empty' });
    }

    const result = convertToonToJsonUtil(toon_input);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: `Error: ${err.message}` });
  }
});

// 5. Query endpoint (standard HTTP request)
app.post('/api/query', async (req, res) => {
  try {
    const { data_text, question, data_format } = req.body;

    if (!data_text || !question || !data_format) {
      return res.status(400).json({ detail: 'Missing required fields: data_text, question, data_format' });
    }

    if (!['JSON', 'TOON'].includes(data_format)) {
      return res.status(400).json({ detail: 'data_format must be either JSON or TOON' });
    }

    const geminiKey = req.headers['x-gemini-api-key'] || null;
    const langsmithKey = req.headers['x-langsmith-api-key'] || null;

    const result = await queryDataWithGeminiUtil(
      data_text,
      question,
      data_format,
      geminiKey,
      langsmithKey
    );

    if (result.error) {
      return res.status(500).json({ detail: result.error });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: `Error: ${err.message}` });
  }
});

// 6. Token counting endpoint
app.post('/api/count', (req, res) => {
  const { text } = req.body;
  const count = countTokens(text || '');
  res.json({ count });
});

// Create HTTP server for Express and WebSocket server
const server = http.createServer(app);

// WebSocket Server for streaming queries: ws://localhost:8000/ws/query
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws/query') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { data_text, question, data_format, api_key, langsmith_key } = data;

      if (!data_text || !question || !data_format) {
        ws.send(JSON.stringify({ error: 'Missing required fields' }));
        return;
      }

      for await (const chunk of streamQueryDataWithGeminiUtil(
        data_text,
        question,
        data_format,
        api_key,
        langsmith_key
      )) {
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk);
        }
      }
    } catch (err) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Client error:', err);
  });
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Lexa Studio Express Server running on http://localhost:${PORT}`);
  });
}

export { app, server };

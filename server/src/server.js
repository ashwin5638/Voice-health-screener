import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { env } from './config/env.js';
import { createCallHandler } from './websocket/callHandler.js';

const app = express();
const allowedOrigins = [env.CLIENT_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''].filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 1 ? allowedOrigins : allowedOrigins[0] || true }));
app.use(express.json({ limit: '5mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'voice-health-screener' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => { console.log('[WS] Client connected'); createCallHandler(ws); });
wss.on('error', (err) => console.error('[WS] Server error:', err));

server.listen(env.PORT, () => {
  console.log(`\n🩺  Voice Health Screener server`);
  console.log(`    HTTP:     http://localhost:${env.PORT}`);
  console.log(`    WebSocket:ws://localhost:${env.PORT}/ws`);
  if (!env.GEMINI_API_KEY && !env.OPENROUTER_API_KEY) console.warn('    ⚠️  No LLM API keys set — set GEMINI_API_KEY or OPENROUTER_API_KEY.');
});

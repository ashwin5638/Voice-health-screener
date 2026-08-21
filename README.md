# Voice Health Screener

A preliminary AI-powered voice intake assistant that collects patient information through natural conversation in English or Hindi. It transcribes speech via Groq Whisper API, generates empathetic replies via LLM, and produces a structured intake report.

## Architecture

```
┌──────────────┐    WebSocket     ┌──────────────────────────────────┐
│  React UI    │ ◄──────────────► │  Node.js Server                  │
│  (Vite)      │                  │                                  │
│              │                  │  ┌───────────┐  ┌─────────────┐  │
│  - Recorder  │                  │  │ Whisper   │  │ LLM         │  │
│  - TTS       │                  │  │ (Groq API)│  │ (Gemini →   │  │
│  - Transcript│                  │  └───────────┘  │  OpenRouter) │  │
│  - Report UI │                  │                 └─────────────┘  │
└──────────────┘                  └──────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS v4 |
| **Speech-to-Text** | Whisper Large-v3 Turbo via Groq API |
| **LLM** | Gemini 3.5 Flash-Lite (primary) with OpenRouter fallback |
| **Text-to-Speech** | Browser SpeechSynthesis API |
| **Transport** | WebSocket (real-time bidirectional audio + messages) |

## Features

- Real-time voice conversation with an AI health intake assistant
- Supports English and Hindi (auto-detected)
- Multi-provider LLM with automatic fallback (Gemini → OpenRouter)
- Whisper STT via Groq API (fast, no local model needed)
- Audio silence detection to skip empty utterances
- Structured JSON health report generation
- Red-flag symptom detection with emergency escalation
- Free to run ($0/month with free API tiers)

## Project Structure

```
voice-health-screener/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── CallControls.jsx
│   │   │   ├── HealthReport.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Transcript.jsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAudioRecorder.js
│   │   │   └── useWebSocket.js
│   │   ├── services/
│   │   │   └── ttsService.js  # Browser TTS
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   └── package.json
└── server/                    # Node.js backend
    ├── src/
    │   ├── config/
    │   │   └── env.js         # Environment config
    │   ├── services/
    │   │   ├── llmService.js  # Multi-provider LLM with fallback
    │   │   ├── reportService.js
    │   │   └── sttService.js  # Whisper STT (local)
    │   ├── websocket/
    │   │   └── callHandler.js # WebSocket call orchestration
    │   └── server.js
    ├── .env                   # API keys (not committed)
    └── package.json
```

## Prerequisites

- Node.js 18+
- npm
- A Groq API key from [console.groq.com](https://console.groq.com) (free, for Whisper STT)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (free, for LLM)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/voice-health-screener.git
cd voice-health-screener

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure environment

Create `server/.env`:

```env
PORT=5000

# Speech-to-Text (required)
GROQ_API_KEY=your_groq_api_key

# LLM (Gemini is primary, OpenRouter is fallback — set either or both)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
```

### 3. Run

Open two terminals:

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

Open http://localhost:5173 in your browser.

## Deployment 

### Backend — Render

### Frontend — Vercel

The app uses a multi-provider fallback strategy to maximize free-tier usage:

| Priority | Provider | Daily Limit | Model |
|----------|----------|-------------|-------|
| 1 (Primary) | Google Gemini | 1,500 requests/day | `gemini-3.5-flash-lite` |
| 2 (Fallback) | OpenRouter | 50 requests/day | `openrouter/free` |

When Gemini returns a 429 (rate limit) or 401 (auth error), the app automatically falls back to OpenRouter. You can set one or both API keys.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ws` | WebSocket | Real-time call session |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `START_CALL` | Client → Server | Begin intake session |
| `AUDIO_CHUNK` | Client → Server | Send audio data |
| `END_CALL` | Client → Server | End session, generate report |
| `STATUS` | Server → Client | Session status updates |
| `TRANSCRIPT_UPDATE` | Server → Client | User speech transcript |
| `AGENT_TEXT` | Server → Client | AI assistant reply |
| `FINAL_REPORT` | Server → Client | Generated health report |
| `ERROR` | Server → Client | Error messages |



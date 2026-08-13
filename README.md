# AI Growth OS

Private, local-first AI-powered digital growth platform. Runs entirely on your own PC using a local LLM (Ollama + Llama 3.1 8B) — no third-party AI API dependency, no data leaves your machine.

## Status
Core platform complete and tested end-to-end: crawler, SEO/GEO/AEO/CRO/LPO engines, content generation, strategy engines, AI agent, database, job queue, memory, rate limiting, and a React dashboard.

## Hardware (tested on)
- CPU: Intel i3-10105 (4c/8t)
- RAM: 16GB
- GPU: None (CPU inference)
- Model: Llama 3.1 8B Instruct Q4_K_M via Ollama
- Model storage: F:\AI_Growth_OS\OllamaModels

## Architecture
## Setup

### 1. Prerequisites
- Node.js 20+ (tested on 24.15.0)
- pnpm (`npm install -g pnpm`)
- Ollama (https://ollama.com/download/windows)

### 2. Pull the model
```powershell
ollama pull llama3.1:8b-instruct-q4_K_M
```

### 3. Set model storage location (optional, avoids filling C:)
```powershell
setx OLLAMA_MODELS "F:\AI_Growth_OS\OllamaModels"
```
(open a new terminal after this, then restart Ollama)

### 4. Install dependencies
```powershell
pnpm install
```

### 5. Configure environment
Copy `.env.example` to `apps/api/.env` and adjust if needed. Defaults work out of the box.

### 6. Run
```powershell
# Terminal 1 - backend
cd apps/api
pnpm dev

# Terminal 2 - frontend
cd apps/web
pnpm dev
```
Backend: http://localhost:3000
Frontend: http://localhost:5173

## API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | API health check |
| `/api/ai/health` | GET | Ollama connectivity check |
| `/api/tools` | GET | List available AI tools |
| `/api/chat` | POST | Chat with the local LLM (supports `sessionId` for memory) |
| `/api/crawl/page` | POST | Crawl a single page |
| `/api/crawl/site` | POST | Crawl multiple pages (sitemap + link following) |
| `/api/seo/analyze` | POST | Deterministic SEO audit (9 checks) |
| `/api/agent/seo` | POST | Full AI-powered SEO audit (crawl + analyze + AI recommendations), saved to DB |
| `/api/engine/:type` | POST | AI analysis engine (`geo`, `aeo`, `cro`, `lpo`) |
| `/api/strategy/:type` | POST | AI strategy engine (`sem`, `aso`, `vseo`, `smo`, `orm`) |
| `/api/content/:type` | POST | AI content generation (`brief`, `article`, `faq`, etc.) |
| `/api/jobs/seo-agent` | POST | Queue an SEO agent run as an async job (202 response) |
| `/api/jobs/crawl-site` | POST | Queue a site crawl as an async job |
| `/api/jobs/:id` | GET | Check job status |
| `/api/reports` | GET | List saved SEO audit reports |
| `/api/reports/:id` | GET/DELETE | Get or delete a report |

All AI-calling endpoints are rate-limited to 5 requests/minute. All endpoints are rate-limited to 60 requests/minute globally.

## Notes
- Response times for AI endpoints depend on hardware; expect 20-160 seconds per request on CPU-only inference with an 8B model.
- The database (`data/app.db`) and model weights (`OllamaModels/`) are gitignored — they stay local to your machine.
- This is a private, single-user tool. It is not hardened for public internet exposure.

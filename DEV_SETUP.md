# 🛠️ Local Development Setup

## Prerequisites

- Node.js v18+
- `.env.local` file with `GEMINI_API_KEY` configured

## Quick Start for Local Development

### Option 1: Run Both Servers (Recommended)

This runs both the Vite dev server (port 5173) and the API server (port 3001) together:

```bash
npm install
npm run dev:full
```

The app will open at `http://localhost:5173` with full image analyzer functionality.

---

### Option 2: Run Servers Separately

**Terminal 1 - Start Vite dev server:**
```bash
npm install
npm run dev
```

**Terminal 2 - Start API server (in a new terminal):**
```bash
npm run dev:server
```

Visit `http://localhost:5173`

---

## How It Works

When you try to analyze an image:

1. **Frontend** (Vite on port 5173) sends a request to `/api/analyzeImage`
2. **Vite proxy** (configured in `vite.config.js`) redirects it to `http://localhost:3001`
3. **Dev server** (Express on port 3001) receives the request
4. **Dev server** calls the Gemini Vision API
5. **Results** are sent back to the frontend

---

## Configuration

### `.env.local` File

Create this file in the root directory:

```bash
GEMINI_API_KEY=your_api_key_here
```

The `dev-server.js` loads this file automatically via `dotenv`.

---

## Troubleshooting

### "API error: Not Found"

✅ Solutions:
- Make sure `npm run dev:server` is running in another terminal
- Check that the dev server is on port 3001 (not blocked by firewall)
- Ensure `.env.local` has `GEMINI_API_KEY` set

### "Gemini API key not configured"

✅ Solutions:
- Verify `.env.local` exists in the root directory
- Check that `GEMINI_API_KEY=...` is in `.env.local` (not `.env`)
- Restart both servers after changing `.env.local`

### Port Already in Use

✅ Solutions:
- Vite: Change port in `vite.config.js` `server.port`
- Dev server: Change `PORT = 3001` in `dev-server.js`
- Or kill existing processes using those ports

### Module Not Found: dotenv / express

```bash
npm install
```

This installs the missing dependencies.

---

## For Production (Vercel)

The API works differently in production:

1. Vercel deploys `api/analyzeImage.js` as a serverless function
2. The function is available at `https://your-domain.com/api/analyzeImage`
3. No dev server needed — it works directly

**Just add environment variable in Vercel Dashboard:**
- **Name**: `GEMINI_API_KEY`
- **Value**: Your API key

---

## File Structure

```
├── vite.config.js          (Proxy configuration)
├── dev-server.js           (Local API server for dev)
├── api/analyzeImage.js     (Production Vercel function)
├── index.html              (Frontend)
├── app.js                  (Frontend logic)
├── style.css               (Styling)
└── .env.local              (Local secrets - not in git)
```

---

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server only (port 5173) |
| `npm run dev:server` | API dev server only (port 3001) |
| `npm run dev:full` | Both servers together |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

**Need help?** Check [IMAGE_SETUP.md](IMAGE_SETUP.md) or [QUICKSTART.md](QUICKSTART.md)

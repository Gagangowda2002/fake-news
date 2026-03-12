# 🚀 Quick Start — Image Analyzer Feature

## In 3 Steps

### 1️⃣ Get Your API Key (2 minutes)
Visit [Google AI Studio](https://aistudio.google.com/app/apikey) → Click "Create API Key" → Copy it

### 2️⃣ Configure Local Development (1 minute)
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and paste your key:
# GEMINI_API_KEY=your_copied_key_here
```

### 3️⃣ Start Development (1 minute)
```bash
npm install
npm run dev:full
```

This runs:
- Vite dev server on http://localhost:5173 (your app)
- API server on http://localhost:3001 (image analyzer backend)

---

## 🎯 Using the Image Analyzer

1. **Navigate** to "Image Analyzer" section
2. **Upload** an image (drag-drop or click)
3. **Preview** your image
4. **Click "Analyze Image"**
5. **View Results**:
   - ✅ Authentic / ❌ Manipulated / ⚠️ Inconclusive
   - Confidence percentage
   - Detailed findings

---

## 🌐 Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Add image analyzer"
git push

# In Vercel Dashboard:
# 1. Settings → Environment Variables
# 2. Add: GEMINI_API_KEY = your_key
# 3. Redeploy
```

---

## ⚙️ Advanced: Running Servers Separately

If `npm run dev:full` doesn't work, run in separate terminals:

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run dev:server
```

---

## ❓ Common Questions

**Q: Getting "API error: Not Found"?**
A: Make sure both servers are running. Use `npm run dev:full` or check [DEV_SETUP.md](DEV_SETUP.md)

**Q: Is my image stored?**
A: No, images are analyzed and discarded. Only results are returned.

**Q: What image formats work?**
A: JPG, PNG, GIF, WebP (max 5MB)

**Q: How long does analysis take?**
A: Usually 2-5 seconds depending on image size.

---

## 📖 Full Documentation

- **DEV_SETUP.md** — Local development details
- **FEATURE_SUMMARY.md** — Complete feature breakdown
- **IMAGE_SETUP.md** — Detailed setup guide
- **README.md** — Full project documentation

---

**Ready?** Let's detect image manipulation! 🎉

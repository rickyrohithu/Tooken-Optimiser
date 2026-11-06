# LangSmith Setup Guide

Complete guide to set up LangSmith observability for the Lexa Studio backend.

## What is LangSmith?

LangSmith is an observability platform for LLM applications that helps you:

- Track AI model requests and responses
- Monitor token usage and costs
- Debug issues with prompts
- Analyze performance metrics

**Note:** LangSmith is **optional** for this application. The app works perfectly without it!

---

## Step 1: Get Your LangSmith API Key

1. Visit [LangSmith Settings](https://smith.langchain.com/settings)
2. Sign in or create a free account
3. Navigate to **"API Keys"** section
4. Click **"Create API Key"**
5. Copy the key

---

## Step 2: Configure Environment Variables

### Backend Setup

Edit your `backend/.env` file and add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
```

**Windows (PowerShell)** - temporary session:

```powershell
$env:LANGSMITH_API_KEY="your_api_key_here"
```

**Linux/Mac**:

```bash
export LANGSMITH_API_KEY="your_api_key_here"
```

---

## Step 3: Restart Backend Server

After setting the environment variable, restart your FastAPI backend:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

---

## Step 4: Verify Connection

### Check Status Indicator

1. Open your React frontend at `http://localhost:5173`
2. Look at the **Connection Status** sidebar
3. You should see:
   - ✅ **LangSmith** - Connected
   - ✅ **Gemini AI** - Connected

### Check LangSmith Dashboard

1. Visit [LangSmith Dashboard](https://smith.langchain.com)
2. Navigate to **Projects**
3. You should see traces for:
   - AI-powered queries from the Query & Analysis tab

---

## Production Deployment

### Render (Backend)

Add environment variables in Render dashboard:

1. Go to your service → **Environment**
2. Add:
   ```
   LANGSMITH_API_KEY = your_langsmith_key
   LANGSMITH_TRACING = true
   ```
3. Redeploy (automatic)

### Local Development

The backend loads environment variables from `.env` automatically using `python-dotenv`.

---

## Troubleshooting

### ❌ "LangSmith - Set LANGSMITH_API_KEY"

**Solutions:**

1. Verify the API key is set in `backend/.env`
2. Restart the backend server
3. Check the terminal for errors
4. Ensure the key is valid (not expired)

### ❌ No traces appearing in LangSmith

**Solutions:**

1. Set `LANGSMITH_TRACING=true` in your `.env`
2. Perform a query in the Query & Analysis tab
3. Check the backend console for connection errors
4. Verify your LangSmith API key has proper permissions

### ❌ CORS errors

**Solutions:**

1. Check that frontend is configured with correct backend URL
2. Verify CORS settings in `backend/main.py`
3. Clear browser cache

---

## Optional: Disable LangSmith

To run without LangSmith:

1. Remove `LANGSMITH_API_KEY` from `.env`
2. Or set `LANGSMITH_TRACING=false`
3. The app will work normally without observability

---

## Learn More

- [LangSmith Documentation](https://docs.smith.langchain.com/)
- [LangSmith Python SDK](https://pypi.org/project/langsmith/)

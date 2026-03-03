# CORS Fix & Vercel Deployment Checklist

## Problem Solved ✓
- **Issue:** Frontend was fetching `https://qa-kamp-backend.vercel.app/api/api/status` (double `/api`)
- **Root cause:** `VITE_API_URL` env var already contained `/api`, and the code was appending `/api/status`
- **Fix:** Frontend now removes trailing `/api` from `VITE_API_URL` before appending `/api/status`

## Vercel Setup Steps

### Backend (qa-kamp-backend)
1. Go to Vercel Dashboard → Select Backend project
2. Settings → Environment Variables
3. Add these variables:
   - **FRONTEND_ORIGIN** = `https://qa-kamp.vercel.app`
4. Deploy (auto-redeploy on git push, or manual redeploy)
5. Verify: Open `https://qa-kamp-backend.vercel.app/api/status` in browser — should return JSON

### Frontend (qa-kamp)
1. Go to Vercel Dashboard → Select Frontend project
2. Settings → Environment Variables
3. Add this variable:
   - **VITE_API_URL** = `https://qa-kamp-backend.vercel.app` (NO trailing /api)
4. Deploy (auto-redeploy or manual)
5. Verify: Open `https://qa-kamp.vercel.app` in browser → click "Check health" button → should show message from backend

## Test Locally (Optional)
```powershell
# Terminal 1: Start backend
cd Backend
$env:FRONTEND_ORIGIN='http://localhost:5173'
npm run dev

# Terminal 2: Start frontend
cd Frontend\QA-Kamp
npm run dev
# Visit http://localhost:5173
# Click "Check health" button — should show backend message
```

## CORS Headers Verification (Debug)
```powershell
# Check if backend returns CORS headers
curl -i https://qa-kamp-backend.vercel.app/api/status

# Expected response header:
# Access-Control-Allow-Origin: https://qa-kamp.vercel.app
```

## Files Changed
- `Frontend/QA-Kamp/src/App.tsx` — removed double /api issue
- `Backend/src/index.ts` — uses cors package with FRONTEND_ORIGIN env var
- `Backend/api/status.ts` — serverless function returns CORS headers
- Added `.env.example` files for reference

## Next Steps
1. Update Vercel env vars as shown above
2. Redeploy both projects
3. Test in browser
4. If still issues, check Vercel Logs (Deployments tab)


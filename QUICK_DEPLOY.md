# Quick Deploy to Render

## 🚀 Fast Track (5 minutes)

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Create Static Site on Render
1. Go to https://dashboard.render.com
2. Click "New +" → **"Static Site"**
3. Connect your GitHub repo
4. Select `flex-tournament` repository

### 3. Configure Settings
- **Name:** `bracketooski`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Node Version:** `20` (auto-detected)

### 4. Add Environment Variables
Click "Advanced" → "Add Environment Variable"

Add these two:
```
VITE_SUPABASE_URL = (your Supabase project URL)
VITE_SUPABASE_ANON_KEY = (your Supabase anon key)
```

**Get these from:** Supabase Dashboard → Settings → API

### 5. Deploy!
Click "Create Static Site" and wait 2-5 minutes.

### 6. Add Your Domain
1. In Render dashboard → Your service → Settings → Custom Domains
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `bracketooski.com`)
4. Follow DNS instructions Render provides

**DNS Setup:**
- For root domain: Add `A` record pointing to Render's IP (they'll provide)
- For www: Add `CNAME` record pointing to `bracketooski.onrender.com`

### 7. Update Supabase
1. Supabase Dashboard → Authentication → URL Configuration
2. Add to **Redirect URLs:**
   - `https://yourdomain.com/**`
   - `https://bracketooski.onrender.com/**`

## ✅ Done!

Your app should be live! Test it:
- Visit your domain
- Try login/signup
- Create a tournament
- Test share code viewer mode

## 🆘 Issues?

- **Build fails?** Check logs in Render dashboard
- **Auth not working?** Verify Supabase URLs are added
- **Domain not working?** DNS can take 24-48 hours to propagate


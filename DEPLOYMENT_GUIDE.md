# Deployment Guide: bracketooski to Render

## Prerequisites
- ✅ Render account (sign up at https://render.com)
- ✅ GitHub repository with your code
- ✅ Domain purchased and ready to configure
- ✅ Supabase project with environment variables ready

## Step 1: Prepare Your Repository

1. **Make sure your code is pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Verify your `.gitignore` includes:**
   - `.env.local`
   - `node_modules/`
   - `dist/`

## Step 2: Create Render Web Service

1. **Log in to Render Dashboard:**
   - Go to https://dashboard.render.com
   - Sign in or create an account

2. **Create New Web Service:**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Select your `flex-tournament` repository

3. **Configure Build Settings:**
   - **Name:** `bracketooski` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Node Version:** `20` (or latest LTS)

## Step 3: Set Environment Variables

In the Render dashboard, go to your service → Environment tab, and add:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note:** `VITE_SUPABASE_SECRET_KEY` is only needed server-side. For a static site, you typically don't need it.

**To find your Supabase keys:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

## Step 4: Deploy

1. Click "Create Static Site" or "Save Changes"
2. Render will automatically:
   - Clone your repo
   - Install dependencies
   - Run the build command
   - Deploy to a `.onrender.com` URL

3. **Wait for deployment** (usually 2-5 minutes)
4. **Test the deployment:**
   - Visit the provided `.onrender.com` URL
   - Test login/signup
   - Create a test tournament
   - Test viewer mode with share code

## Step 5: Configure Custom Domain

1. **In Render Dashboard:**
   - Go to your service → Settings → Custom Domains
   - Click "Add Custom Domain"
   - Enter your domain (e.g., `bracketooski.com` or `www.bracketooski.com`)

2. **Configure DNS (at your domain registrar):**
   
   **For root domain (bracketooski.com):**
   - Type: `A` or `ALIAS` or `CNAME`
   - Name: `@` (or leave blank)
   - Value: Render will provide this (usually something like `dns.render.com` or an IP)
   
   **For www subdomain (www.bracketooski.com):**
   - Type: `CNAME`
   - Name: `www`
   - Value: Render will provide (usually your service URL like `bracketooski.onrender.com`)

3. **SSL Certificate:**
   - Render automatically provisions SSL certificates via Let's Encrypt
   - This happens automatically after DNS propagates (can take up to 48 hours)

## Step 6: Update Supabase Settings (Important!)

1. **Add your domain to Supabase allowed origins:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Render URL and custom domain to:
     - **Site URL:** `https://yourdomain.com`
     - **Redirect URLs:** 
       - `https://yourdomain.com/**`
       - `https://yourdomain.onrender.com/**`

2. **Update RLS policies if needed:**
   - Your existing RLS policies should work, but verify they allow public read access for share codes

## Step 7: Post-Deployment Checklist

- [ ] Test authentication (login/signup)
- [ ] Test tournament creation
- [ ] Test bracket generation
- [ ] Test game management
- [ ] Test viewer mode with share code
- [ ] Verify all environment variables are set
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify SSL certificate is active (HTTPS)

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify Node version matches local (check `package.json` or `.nvmrc`)
- Ensure all dependencies are in `package.json` (not just `devDependencies`)

### Environment Variables Not Working
- Remember: Vite requires `VITE_` prefix for client-side variables
- Restart the service after adding environment variables
- Check browser console - variables are injected at build time

### Authentication Not Working
- Verify Supabase URL and keys are correct
- Check Supabase allowed origins include your domain
- Check browser console for CORS errors

### Domain Not Working
- DNS propagation can take 24-48 hours
- Verify DNS records are correct using `dig` or `nslookup`
- Check Render custom domain status shows "Active"

### Share Code Not Working
- Verify database connection
- Check RLS policies allow public read access
- Test with a known share code from your database

## Support

- Render Docs: https://render.com/docs
- Render Support: support@render.com
- Supabase Docs: https://supabase.com/docs

## Next Steps After Deployment

1. Set up monitoring (optional):
   - Add error tracking (Sentry, LogRocket, etc.)
   - Set up uptime monitoring

2. Performance optimization:
   - Enable CDN caching
   - Optimize images
   - Add service worker for offline support (optional)

3. Analytics (optional):
   - Add Google Analytics or similar
   - Track user engagement


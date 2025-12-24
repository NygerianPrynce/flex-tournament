# Fix for Page Reload 404 Errors on Render

## The Problem
When you reload a page (e.g., `/tournament/bracket`), you get a 404 error because the server tries to find that file, but it doesn't exist (it's a client-side route).

## Solution Options

### Option 1: Configure in Render Dashboard (Recommended)
1. Go to your Render dashboard
2. Select your `bracketooski` static site
3. Go to **Settings** → **Redirects/Rewrites**
4. Add a rewrite rule:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Status Code:** `200`

### Option 2: Use the _redirects File (Already Created)
The `_redirects` file in the `public` folder should work, but you may need to:
1. Ensure it's being copied to `dist` during build
2. Verify Render recognizes it (some static site hosts require dashboard configuration)

### Option 3: Manual Configuration
If the above don't work, you may need to:
1. Contact Render support to enable SPA routing
2. Or switch to a web service (not static site) and add a simple Express server with fallback routing

## Current Setup
- ✅ `_redirects` file created in `public/` folder
- ✅ Vite plugin added to ensure it's copied to `dist/`
- ✅ Format: `/* /index.html 200`

## Next Steps
1. Try configuring the redirect in Render dashboard first (Option 1)
2. If that doesn't work, verify the `_redirects` file is in your `dist` folder after build
3. If still not working, contact Render support


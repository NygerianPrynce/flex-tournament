# Environment Variables Setup

## Create `.env.local` file

Create a file named `.env.local` in the root directory of your project (same level as `package.json`) with the following content:

```
VITE_SUPABASE_URL=https://iwtcsrohjrelpdxlwqsy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dGNzcm9oanJlbHBkeGx3cXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODYxMTEsImV4cCI6MjA4MjE2MjExMX0.onqwm9fvxTBuYRP_yB27YDR5thatmDddc-KzLOSgSR8
VITE_SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dGNzcm9oanJlbHBkeGx3cXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU4NjExMSwiZXhwIjoyMDgyMTYyMTExfQ.QXSf-ylCLJVWYEle2GPOryjyvq4ZGaFqBVtKFGMzfR0
```

## How to create the file:

### Option 1: Using Terminal/Command Line
```bash
# Navigate to your project directory
cd /Users/nygerianprynce/Documents/flex-tournament

# Create the file (macOS/Linux)
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://iwtcsrohjrelpdxlwqsy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dGNzcm9oanJlbHBkeGx3cXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODYxMTEsImV4cCI6MjA4MjE2MjExMX0.onqwm9fvxTBuYRP_yB27YDR5thatmDddc-KzLOSgSR8
VITE_SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dGNzcm9oanJlbHBkeGx3cXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU4NjExMSwiZXhwIjoyMDgyMTYyMTExfQ.QXSf-ylCLJVWYEle2GPOryjyvq4ZGaFqBVtKFGMzfR0
EOF
```

### Option 2: Using a Text Editor
1. Open your project in your code editor (VS Code, etc.)
2. Create a new file in the root directory
3. Name it exactly `.env.local` (with the dot at the beginning)
4. Paste the three lines above into the file
5. Save the file

### Option 3: Using Finder (macOS)
1. Open Finder and navigate to your project folder
2. Press `Cmd + Shift + .` to show hidden files
3. Create a new text file named `.env.local`
4. Open it in TextEdit and paste the content above
5. Save and close

## Important Notes:

- The `.env.local` file should be in the **root directory** of your project (same folder as `package.json`)
- Make sure there are **no spaces** around the `=` sign
- The file should start with a dot (`.env.local`) - this makes it a hidden file on Unix systems
- **Never commit this file to git** - it contains sensitive keys. It should already be in `.gitignore`

## Verify it's working:

After creating the file, restart your development server:
```bash
npm run dev
```

The environment variables should now be available in your application!


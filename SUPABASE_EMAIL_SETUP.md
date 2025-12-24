# Fixing Email Confirmation Error

## Option 1: Disable Email Confirmation (Recommended for Development)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/iwtcsrohjrelpdxlwqsy
2. Navigate to **Authentication** → **Settings** (in the left sidebar)
3. Scroll down to **Email Auth** section
4. Find **"Enable email confirmations"** toggle
5. **Turn it OFF** (disable email confirmations)
6. Click **Save**

Now users can sign up without needing to confirm their email.

## Option 2: Configure Email Service (For Production)

If you want to keep email confirmations enabled, you need to configure an email service:

1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure an SMTP provider (SendGrid, Mailgun, etc.)
3. Or use Supabase's built-in email service (limited)

## Option 3: Update Login Page to Handle Email Confirmation

We can also update the login page to show a better message when email confirmation is required.

## Recommended: Disable for Now

For development and testing, I recommend **Option 1** - just disable email confirmations. You can always enable it later when you're ready for production.

After disabling email confirmations, try signing up again!


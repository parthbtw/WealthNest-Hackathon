# 🚀 Quick Start Guide - WealthNest

## ⚠️ Before You Begin

**You MUST set up the database first!** If you skip this step, the app won't work.

---

## 1️⃣ Set Up Supabase Database (REQUIRED)

### Create Your Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create a free account
3. Click **"New Project"**
4. Fill in:
   - Organization: Choose your organization
   - Name: `wealthnest` (or any name you prefer)
   - Database Password: Create a strong password (save this!)
   - Region: Choose the closest region to you
5. Click **"Create new project"**
6. Wait ~2 minutes for the project to be created

### Run the Database Schema
🚨 **THIS IS THE MOST IMPORTANT STEP!**

1. In your Supabase project dashboard, find the left sidebar
2. Click on **"SQL Editor"** (icon looks like `</>`)
3. Click **"New Query"** button
4. Open the `supabase_schema.sql` file in this Replit project
5. **Copy ALL 91 lines** of the SQL code
6. **Paste** it into the Supabase SQL Editor
7. Click **"RUN"** (or press Ctrl+Enter on Windows/Linux, Cmd+Enter on Mac)
8. You should see: **"Success. No rows returned"**

✅ If you see "Success", the database is ready!
❌ If you see an error, make sure you copied the entire file.

---

## 2️⃣ Connect Replit to Supabase

### Get Your API Credentials
1. In Supabase, click the **gear icon** (⚙️) in the bottom left (Project Settings)
2. Click **"API"** in the settings menu
3. Find these two values:
   - **Project URL**: Looks like `https://xxxxx.supabase.co`
   - **anon public key**: Long string under "Project API keys" > "anon public"

### Add to Replit Secrets
1. In Replit, open the **Tools** panel (left sidebar)
2. Click **"Secrets"** tab
3. Verify these two secrets exist (they should already be there):
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
4. If they're missing, click **"Add new secret"** and add them

---

## 3️⃣ Test the App

1. Make sure the dev server is running (should start automatically)
2. Click the **webview** preview
3. Click **"Sign Up"**
4. Fill in the form:
   - Full Name: Your name
   - Email: Your email
   - Password: At least 6 characters
5. Click **"Sign Up"**

### What Should Happen:
- ✅ You'll see a message about checking your email
- ✅ Log in with your credentials
- ✅ You'll be redirected to the Dashboard
- ✅ You'll see **three vault cards** with $0.00 balances:
  - 💰 Micro-Savings Vault
  - 🛡️ Emergency Vault
  - 🏦 Pension Nest

### If You See "Unable to load your vaults":
❌ This means you didn't run the database schema correctly.
🔧 Go back to Step 1️⃣ and make sure you:
   - Opened the SQL Editor in Supabase
   - Copied ALL 91 lines from supabase_schema.sql
   - Clicked RUN and saw "Success"

---

## 4️⃣ Test Deposits

1. Click on any vault card (e.g., Micro-Savings Vault)
2. Click the **"💸 Deposit"** button
3. Enter an amount (e.g., `100.00`)
4. Click **"Confirm"**
5. You should see:
   - ✅ Green success message
   - ✅ Updated balance
   - ✅ Form closes automatically

---

## 🎉 Success!

You now have a working super-wallet PWA with:
- ✅ User authentication
- ✅ Three vault types
- ✅ Deposit functionality
- ✅ Transaction tracking

---

## 📚 Next Steps

- Read `DATABASE_SETUP.md` for detailed troubleshooting
- Read `DEPOSIT_FEATURE.md` to learn about the deposit functionality
- Check `replit.md` for the full project architecture

---

## 🆘 Common Issues

### "Could not find the table"
- **Problem**: Database schema wasn't run
- **Solution**: Go to Supabase SQL Editor and run supabase_schema.sql

### "Invalid login credentials"
- **Problem**: Wrong email/password
- **Solution**: Make sure you're using the credentials you signed up with

### "Email confirmation required"
- **Problem**: Supabase has email confirmation enabled
- **Solution**: Check your email for confirmation link, or disable email confirmation in Supabase Auth settings

### Server not starting
- **Problem**: Port 5000 already in use
- **Solution**: Restart the workflow from the Replit interface

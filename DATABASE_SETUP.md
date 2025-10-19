# 🚨 Database Setup Guide - REQUIRED FIRST STEP

**IMPORTANT:** You must complete this setup before using WealthNest. If you see "Unable to load your vaults" after signup, it means you haven't run the database schema yet.

Follow these steps to set up your Supabase database for WealthNest:

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click "New Project"
3. Choose your organization, enter a project name, and set a database password
4. Wait ~2 minutes for your project to be created

## Step 2: Run the Database Schema ⚠️ CRITICAL STEP

1. In your Supabase dashboard, click on the **SQL Editor** in the left sidebar
2. Click "New Query"
3. Copy the **ENTIRE contents** of the `supabase_schema.sql` file from this project (all 91 lines)
4. Paste it into the SQL editor
5. Click **RUN** (or press Ctrl+Enter / Cmd+Enter)
6. You should see a success message: "Success. No rows returned"

This will create:
- **profiles** table - stores user information
- **vaults** table - stores the three vault types for each user
- **transactions** table - stores transaction history
- **Row Level Security (RLS) policies** - ensures users can only access their own data
- **Automatic trigger** - creates profiles and vaults when users sign up

## Step 3: Get Your API Credentials

1. In your Supabase dashboard, go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 4: Add Credentials to Replit

The credentials should already be added to your Replit Secrets. You can verify by checking the Secrets tab in the Tools panel.

## Step 5: Test the Setup

1. Make sure the dev server is running
2. Click "Sign Up" and create a test account
3. You should be redirected to the dashboard with three vaults showing $0.00 balances

## Troubleshooting

**Issue**: "No vaults found" message on dashboard
- **Solution**: Make sure you ran the SQL schema in Supabase. Check the SQL Editor for any errors.

**Issue**: "Unable to load your vaults" error
- **Solution**: Verify your Supabase credentials are correct in Replit Secrets.

**Issue**: Signup works but no redirect to dashboard
- **Solution**: If email confirmation is enabled in Supabase, you'll need to confirm your email first. Check your email inbox for a confirmation link.

## Optional: Disable Email Confirmation (for testing)

For development/testing purposes, you can disable email confirmation:

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Under Email, toggle off "Confirm email"
3. Save changes

This allows users to sign up and login immediately without email verification.

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  wealthnest_id INTEGER UNIQUE,
  pension_target_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vaults table
CREATE TABLE IF NOT EXISTS vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vault_type TEXT NOT NULL CHECK (vault_type IN ('micro_savings', 'emergency', 'pension')),
  balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE,
  vesting_start_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, vault_type)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (saved_amount >= 0),
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make this script idempotent)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own vaults" ON vaults;
DROP POLICY IF EXISTS "Users can update their own vaults" ON vaults;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Vaults policies
CREATE POLICY "Users can view their own vaults"
  ON vaults FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own vaults"
  ON vaults FOR UPDATE
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create profile and vaults on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_wealthnest_id INTEGER;
  v_id_exists BOOLEAN;
BEGIN
  -- Generate a unique 6-digit WealthNest ID
  LOOP
    -- Generate random 6-digit number (100000 to 999999)
    v_wealthnest_id := floor(random() * 900000 + 100000)::INTEGER;
    
    -- Check if this ID already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE wealthnest_id = v_wealthnest_id) INTO v_id_exists;
    
    -- Exit loop if ID is unique
    EXIT WHEN NOT v_id_exists;
  END LOOP;
  
  -- Insert profile with unique WealthNest ID
  INSERT INTO public.profiles (id, full_name, wealthnest_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', v_wealthnest_id);
  
  -- Create three default vaults
  INSERT INTO public.vaults (user_id, vault_type, balance)
  VALUES 
    (NEW.id, 'micro_savings', 0.00),
    (NEW.id, 'emergency', 0.00),
    (NEW.id, 'pension', 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile and vaults on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_vault_id ON transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Function to allocate funds from Micro-Savings to a goal (atomic transaction)
CREATE OR REPLACE FUNCTION allocate_funds_to_goal(
  p_goal_id BIGINT,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_vault_id UUID;
  v_new_balance NUMERIC;
  v_goal_name TEXT;
  v_goal_user_id UUID;
  v_new_saved_amount NUMERIC;
  v_target_amount NUMERIC;
  v_goal_completed BOOLEAN := false;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Get the goal and verify ownership
  SELECT user_id, goal_name, target_amount INTO v_goal_user_id, v_goal_name, v_target_amount
  FROM goals
  WHERE id = p_goal_id;

  IF v_goal_user_id IS NULL THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;

  IF v_goal_user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Goal does not belong to user';
  END IF;

  -- Get the user's Micro-Savings vault ID
  SELECT id INTO v_vault_id
  FROM vaults
  WHERE user_id = v_user_id AND vault_type = 'micro_savings';

  IF v_vault_id IS NULL THEN
    RAISE EXCEPTION 'Micro-Savings vault not found';
  END IF;

  -- Perform atomic operations:
  
  -- 1. Decrement Micro-Savings vault balance with conditional UPDATE
  --    This prevents race conditions by checking balance in the same statement
  UPDATE vaults
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_vault_id 
    AND balance >= p_amount  -- Critical: ensures sufficient balance atomically
  RETURNING balance INTO v_new_balance;

  -- Check if update succeeded (row was found and balance was sufficient)
  IF NOT FOUND THEN
    -- Either vault doesn't exist or insufficient balance
    -- Since we already verified vault exists, this means insufficient balance
    RAISE EXCEPTION 'Insufficient balance in Micro-Savings vault';
  END IF;

  -- 2. Increment goal's saved_amount
  UPDATE goals
  SET saved_amount = saved_amount + p_amount
  WHERE id = p_goal_id
  RETURNING saved_amount INTO v_new_saved_amount;

  -- Check if goal is now completed
  IF v_new_saved_amount >= v_target_amount THEN
    -- Update goal status to completed
    UPDATE goals
    SET status = 'completed'
    WHERE id = p_goal_id;
    
    v_goal_completed := true;
  END IF;

  -- 3. Insert transaction record for vault withdrawal
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_user_id,
    v_vault_id,
    -p_amount,
    'Allocated to goal: ' || v_goal_name
  );

  -- Return success with updated info
  RETURN json_build_object(
    'success', true,
    'message', CASE 
      WHEN v_goal_completed THEN 'Congratulations! You''ve reached your goal: ' || v_goal_name || '!'
      ELSE 'Successfully allocated ' || p_amount::text || ' to ' || v_goal_name
    END,
    'goal_id', p_goal_id,
    'amount', p_amount,
    'new_balance', v_new_balance,
    'goal_completed', v_goal_completed
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically, just re-raise the error
    RAISE;
END;
$$;

-- Drop the old version of the function if it exists
DROP FUNCTION IF EXISTS transfer_funds_to_user(p_recipient_email TEXT, p_amount NUMERIC);
DROP FUNCTION IF EXISTS transfer_funds_to_user(p_recipient_wealthnest_id INTEGER, p_amount NUMERIC);

-- Function to transfer funds between users (atomic P2P transfer)
-- Accepts either WealthNest ID or Email (exactly one must be provided)
CREATE OR REPLACE FUNCTION transfer_funds_to_user(
  p_recipient_wealthnest_id INTEGER DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_sender_vault_id UUID;
  v_recipient_vault_id UUID;
  v_sender_new_balance NUMERIC;
  v_recipient_new_balance NUMERIC;
  v_sender_wealthnest_id INTEGER;
  v_sender_email TEXT;
  v_recipient_identifier TEXT;
  v_sender_identifier TEXT;
  v_use_id BOOLEAN;
BEGIN
  -- Get the authenticated user ID (sender)
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate amount is positive
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Validate that exactly one recipient identifier is provided
  IF (p_recipient_wealthnest_id IS NULL AND p_recipient_email IS NULL) THEN
    RAISE EXCEPTION 'Please provide either a WealthNest ID or an email address.';
  END IF;

  IF (p_recipient_wealthnest_id IS NOT NULL AND p_recipient_email IS NOT NULL) THEN
    RAISE EXCEPTION 'Please provide either a WealthNest ID or an email address, not both.';
  END IF;

  -- Determine which identifier was provided
  IF p_recipient_wealthnest_id IS NOT NULL THEN
    v_use_id := true;
    
    -- Validate WealthNest ID format (6-digit number)
    IF p_recipient_wealthnest_id < 100000 OR p_recipient_wealthnest_id > 999999 THEN
      RAISE EXCEPTION 'Invalid WealthNest ID. Please enter a valid 6-digit ID.';
    END IF;
    
    -- Get sender's WealthNest ID for self-transfer check
    SELECT wealthnest_id INTO v_sender_wealthnest_id
    FROM profiles
    WHERE id = v_sender_id;

    -- Prevent self-transfers
    IF v_sender_wealthnest_id = p_recipient_wealthnest_id THEN
      RAISE EXCEPTION 'You cannot transfer money to yourself.';
    END IF;

    -- Find recipient by WealthNest ID
    SELECT id INTO v_recipient_id
    FROM profiles
    WHERE wealthnest_id = p_recipient_wealthnest_id;

    IF v_recipient_id IS NULL THEN
      RAISE EXCEPTION 'Recipient not found. Please check the WealthNest ID.';
    END IF;
    
    v_recipient_identifier := 'ID: ' || p_recipient_wealthnest_id::text;
    v_sender_identifier := 'ID: ' || v_sender_wealthnest_id::text;
  ELSE
    v_use_id := false;
    
    -- Get sender's email for self-transfer check
    SELECT email INTO v_sender_email
    FROM auth.users
    WHERE id = v_sender_id;

    -- Prevent self-transfers
    IF LOWER(v_sender_email) = LOWER(p_recipient_email) THEN
      RAISE EXCEPTION 'You cannot transfer money to yourself.';
    END IF;

    -- Find recipient by email
    SELECT au.id INTO v_recipient_id
    FROM auth.users au
    WHERE LOWER(au.email) = LOWER(p_recipient_email);

    IF v_recipient_id IS NULL THEN
      RAISE EXCEPTION 'Recipient not found. Please check the email address.';
    END IF;
    
    v_recipient_identifier := p_recipient_email;
    v_sender_identifier := v_sender_email;
  END IF;

  -- Get sender's Micro-Savings vault
  SELECT id INTO v_sender_vault_id
  FROM vaults
  WHERE user_id = v_sender_id AND vault_type = 'micro_savings';

  IF v_sender_vault_id IS NULL THEN
    RAISE EXCEPTION 'Your Micro-Savings vault is not set up. Please contact support.';
  END IF;

  -- Get recipient's Micro-Savings vault
  SELECT id INTO v_recipient_vault_id
  FROM vaults
  WHERE user_id = v_recipient_id AND vault_type = 'micro_savings';

  IF v_recipient_vault_id IS NULL THEN
    RAISE EXCEPTION 'Recipient has not completed their account setup. Please ask them to log in to WealthNest at least once to activate their account.';
  END IF;

  -- Perform atomic operations:
  
  -- 1. Decrement sender's vault balance with conditional UPDATE
  UPDATE vaults
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_sender_vault_id 
    AND balance >= p_amount  -- Ensures sufficient balance atomically
  RETURNING balance INTO v_sender_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance in your Micro-Savings vault';
  END IF;

  -- 2. Increment recipient's vault balance
  UPDATE vaults
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = v_recipient_vault_id
  RETURNING balance INTO v_recipient_new_balance;

  -- 3. Insert transaction record for sender (negative amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_sender_id,
    v_sender_vault_id,
    -p_amount,
    'Transfer sent to ' || v_recipient_identifier
  );

  -- 4. Insert transaction record for recipient (positive amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_recipient_id,
    v_recipient_vault_id,
    p_amount,
    'Transfer received from ' || v_sender_identifier
  );

  -- Return success with updated info
  RETURN json_build_object(
    'success', true,
    'message', 'Transfer of ' || p_amount::text || ' to ' || v_recipient_identifier || ' successful!',
    'amount', p_amount,
    'recipient_identifier', v_recipient_identifier,
    'sender_new_balance', v_sender_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically, just re-raise the error
    RAISE;
END;
$$;

-- Function: Apply parking incentive (0.25%) to Emergency Vault
-- This function atomically updates the vault balance and records the transaction
CREATE OR REPLACE FUNCTION apply_parking_incentive(p_vault_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vault_id UUID;
  v_current_balance NUMERIC;
  v_incentive_amount NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get the current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the vault ID and current balance
  SELECT id, balance INTO v_vault_id, v_current_balance
  FROM vaults
  WHERE user_id = v_user_id AND vault_type = p_vault_type;

  IF v_vault_id IS NULL THEN
    RAISE EXCEPTION 'Vault not found';
  END IF;

  -- Validate balance is positive
  IF v_current_balance <= 0 THEN
    RAISE EXCEPTION 'Cannot apply incentive to an empty vault';
  END IF;

  -- Calculate incentive (0.25% = 0.0025)
  v_incentive_amount := ROUND((v_current_balance * 0.0025)::NUMERIC, 2);
  v_new_balance := v_current_balance + v_incentive_amount;

  -- Perform atomic operations:
  
  -- 1. Update vault balance
  UPDATE vaults
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_vault_id;

  -- 2. Insert incentive transaction (positive amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_user_id,
    v_vault_id,
    v_incentive_amount,
    'Annual parking incentive'
  );

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'message', '0.25% annual parking incentive applied!',
    'incentive_amount', v_incentive_amount,
    'new_balance', v_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically, just re-raise the error
    RAISE;
END;
$$;

-- Function: Transfer from Micro-Savings to Pension Nest (atomic)
-- Handles first-time deposit logic (vesting_start_date and locked_until)
CREATE OR REPLACE FUNCTION transfer_to_pension_from_microsavings(
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_microsavings_vault_id UUID;
  v_pension_vault_id UUID;
  v_microsavings_new_balance NUMERIC;
  v_pension_new_balance NUMERIC;
  v_is_first_deposit BOOLEAN;
  v_now TIMESTAMP WITH TIME ZONE;
  v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate amount is positive
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Get Micro-Savings vault
  SELECT id INTO v_microsavings_vault_id
  FROM vaults
  WHERE user_id = v_user_id AND vault_type = 'micro_savings';

  IF v_microsavings_vault_id IS NULL THEN
    RAISE EXCEPTION 'Micro-Savings vault not found';
  END IF;

  -- Get Pension vault
  SELECT id, balance INTO v_pension_vault_id, v_pension_new_balance
  FROM vaults
  WHERE user_id = v_user_id AND vault_type = 'pension';

  IF v_pension_vault_id IS NULL THEN
    RAISE EXCEPTION 'Pension vault not found';
  END IF;

  -- Determine if this is the first deposit (balance is 0)
  v_is_first_deposit := (v_pension_new_balance = 0 OR v_pension_new_balance IS NULL);

  -- Perform atomic operations:
  
  -- 1. Decrement Micro-Savings vault balance with conditional UPDATE
  UPDATE vaults
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_microsavings_vault_id 
    AND balance >= p_amount  -- Ensures sufficient balance atomically
  RETURNING balance INTO v_microsavings_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance in your Micro-Savings vault';
  END IF;

  -- 2. Increment Pension vault balance and set vesting dates if first deposit
  IF v_is_first_deposit THEN
    v_now := NOW();
    v_locked_until := v_now + INTERVAL '1 year';
    
    UPDATE vaults
    SET balance = balance + p_amount,
        vesting_start_date = v_now,
        locked_until = v_locked_until,
        updated_at = NOW()
    WHERE id = v_pension_vault_id
    RETURNING balance INTO v_pension_new_balance;
  ELSE
    UPDATE vaults
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = v_pension_vault_id
    RETURNING balance INTO v_pension_new_balance;
  END IF;

  -- 3. Insert transaction record for Micro-Savings withdrawal (negative amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_user_id,
    v_microsavings_vault_id,
    -p_amount,
    'Transfer to Pension Nest'
  );

  -- 4. Insert transaction record for Pension deposit (positive amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_user_id,
    v_pension_vault_id,
    p_amount,
    'Transfer from Micro-Savings'
  );

  -- Return success with updated info
  RETURN json_build_object(
    'success', true,
    'message', 'Transfer of ' || p_amount::text || ' to Pension Nest successful!',
    'amount', p_amount,
    'microsavings_new_balance', v_microsavings_new_balance,
    'pension_new_balance', v_pension_new_balance,
    'is_first_deposit', v_is_first_deposit
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically, just re-raise the error
    RAISE;
END;
$$;

-- Function: Transfer from Micro-Savings to Emergency Vault
-- This function atomically transfers funds between vaults
CREATE OR REPLACE FUNCTION transfer_to_emergency_from_microsavings(p_amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_microsavings_vault_id UUID;
  v_emergency_vault_id UUID;
  v_microsavings_new_balance NUMERIC;
  v_emergency_new_balance NUMERIC;
BEGIN
  -- Get the current user ID from auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;

  -- Get Micro-Savings vault ID
  SELECT id INTO v_microsavings_vault_id
  FROM vaults
  WHERE user_id = v_user_id AND vault_type = 'micro_savings';

  IF v_microsavings_vault_id IS NULL THEN
    RAISE EXCEPTION 'Your Micro-Savings vault is not set up. Please contact support.';
  END IF;

  -- Get Emergency vault ID
  SELECT id INTO v_emergency_vault_id
  FROM vaults
  WHERE user_id = v_user_id AND vault_type = 'emergency';

  IF v_emergency_vault_id IS NULL THEN
    RAISE EXCEPTION 'Your Emergency vault is not set up. Please contact support.';
  END IF;

  -- Perform atomic operations:
  
  -- 1. Decrement Micro-Savings vault balance with conditional UPDATE
  UPDATE vaults
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_microsavings_vault_id 
    AND balance >= p_amount  -- Ensures sufficient balance atomically
  RETURNING balance INTO v_microsavings_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance in your Micro-Savings vault';
  END IF;

  -- 2. Increment Emergency vault balance
  UPDATE vaults
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = v_emergency_vault_id
  RETURNING balance INTO v_emergency_new_balance;

  -- 3. Insert transaction record for Micro-Savings withdrawal (negative amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_user_id,
    v_microsavings_vault_id,
    -p_amount,
    'Transfer to Emergency Vault'
  );

  -- 4. Insert transaction record for Emergency deposit (positive amount)
  INSERT INTO transactions (user_id, vault_id, amount, description)
  VALUES (
    v_user_id,
    v_emergency_vault_id,
    p_amount,
    'Transfer from Micro-Savings'
  );

  -- Return success with updated info
  RETURN json_build_object(
    'success', true,
    'message', 'Transfer of ' || p_amount::text || ' to Emergency Vault successful!',
    'amount', p_amount,
    'microsavings_new_balance', v_microsavings_new_balance,
    'emergency_new_balance', v_emergency_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically, just re-raise the error
    RAISE;
END;
$$;

-- Migration: Add pension target year and vault locking columns
-- These ALTER TABLE statements are safe to run multiple times (IF NOT EXISTS)

-- Add pension_target_year to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pension_target_year INTEGER;

-- Add lock and vesting columns to vaults table
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS vesting_start_date TIMESTAMP WITH TIME ZONE;

-- Migration: Add WealthNest ID to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wealthnest_id INTEGER UNIQUE;

# Goals Table Setup Guide

## Overview
This document explains how to add the Smart Goal Tracking feature database support to your WealthNest app.

## Database Changes

### New Table: `goals`
A new table has been added to track user financial goals with the following structure:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| `user_id` | UUID | NOT NULL, FK to profiles(id) | Owner of the goal |
| `goal_name` | TEXT | NOT NULL | Name/description of the goal |
| `target_amount` | NUMERIC(12,2) | NOT NULL, > 0 | Target amount to save |
| `saved_amount` | NUMERIC(12,2) | NOT NULL, DEFAULT 0.00, >= 0 | Currently saved amount |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | Goal status: 'active' or 'completed' |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |

### Row Level Security (RLS)
The following RLS policies ensure users can only access their own goals:

- **SELECT**: Users can view their own goals
- **INSERT**: Users can create their own goals
- **UPDATE**: Users can update their own goals
- **DELETE**: Users can delete their own goals

### Performance Indexes
Two indexes have been added for optimal query performance:

- `idx_goals_user_id`: Speeds up user-specific goal queries
- `idx_goals_status`: Speeds up filtering by goal status (active/completed)

## How to Apply Changes

### Option 1: Run Updated Schema (Fresh Setup)
If you're setting up a fresh database:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase_schema.sql`
4. Paste into a new query
5. Click **Run**

This will create all tables including the new `goals` table.

### Option 2: Add Goals Table Only (Existing Database)
If you already have the other tables and just want to add the goals table:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL:

```sql
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
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
```

## Verification

After running the SQL, verify the setup:

1. In Supabase dashboard, go to **Table Editor**
2. You should see a new `goals` table
3. Click on the table and verify:
   - All columns are present with correct types
   - RLS is enabled (green shield icon)
4. Go to **Authentication > Policies**
5. Verify that 4 policies exist for the `goals` table

## Example Usage

### Creating a Goal
```javascript
const { data, error } = await supabase
  .from('goals')
  .insert({
    user_id: user.id,
    goal_name: 'Emergency Fund',
    target_amount: 5000.00,
    saved_amount: 0.00,
    status: 'active'
  })
```

### Fetching User Goals
```javascript
const { data, error } = await supabase
  .from('goals')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
```

### Updating Saved Amount
```javascript
const { data, error } = await supabase
  .from('goals')
  .update({ saved_amount: 1500.00 })
  .eq('id', goalId)
  .eq('user_id', user.id)
```

### Marking Goal as Completed
```javascript
const { data, error } = await supabase
  .from('goals')
  .update({ status: 'completed' })
  .eq('id', goalId)
  .eq('user_id', user.id)
```

## Next Steps

Now that the database is ready, you can:

1. ✅ Create a Goals management page
2. ✅ Add goal creation form
3. ✅ Display goal progress bars
4. ✅ Allow users to allocate funds to goals
5. ✅ Show completed vs active goals
6. ✅ Add goal deletion functionality

## Security Notes

- ✅ Row Level Security (RLS) is enabled
- ✅ Users can only access their own goals
- ✅ Cascade delete ensures goals are deleted when user is deleted
- ✅ CHECK constraints prevent invalid data (negative amounts, invalid status)
- ✅ All policies use `auth.uid()` for authentication

## Troubleshooting

### "relation goals does not exist"
- Make sure you ran the SQL in your Supabase project
- Verify the table appears in the Table Editor

### "permission denied for table goals"
- Check that RLS policies are created
- Verify you're authenticated when making queries
- Ensure `user_id` matches `auth.uid()`

### "value violates check constraint"
- Ensure `target_amount` is positive (> 0)
- Ensure `saved_amount` is non-negative (>= 0)
- Ensure `status` is either 'active' or 'completed'

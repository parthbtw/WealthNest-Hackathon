# Pension Nest Vault - Feature Documentation

## Overview
The Pension Nest is a time-locked retirement savings vault designed to help users build long-term wealth for their retirement. This vault emphasizes security and growth, with restrictions on withdrawals to ensure funds remain available for retirement.

## Page Structure

### Location
- **Route**: `/vault/pension`
- **Component**: `VaultDetail.jsx` (shared component for all vaults)
- **Dashboard Link**: Purple gradient card labeled "Pension Nest"

### Layout Sections

1. **Header**
   - "WealthNest" branding
   - Back button to Dashboard
   - Gold text on dark green background

2. **Vault Information**
   - Icon: 🏦
   - Name: "Pension Nest"
   - Description: "Locked until retirement for your future security"

3. **Balance Display**
   - Large, prominent display
   - Format: USD currency ($X,XXX.XX)
   - Dark green background card with gold text

4. **Action Buttons**
   - **Deposit Button**: ✅ Functional
     - Gold background, dark text
     - Opens deposit amount input form
     - Direct deposit (no modal like Micro-Savings)
   - **Withdraw Button**: 🔒 Locked
     - Gray background, disabled state
     - Text: "🔒 Locked until retirement"
     - Non-clickable (cursor-not-allowed)

5. **Informational Notice** (Purple)
   - Background: Purple with 30% opacity
   - Border: Purple accent
   - Content: "This vault is time-locked to ensure your retirement security. Funds can only be withdrawn after reaching retirement age."

6. **Key Features Section** (NEW)
   - Background: Dark green (bg-primary-dark)
   - Border: 2px gold border
   - Title: "Key Features" in gold
   - Four features with emoji icons:
     - 💼 Long-term retirement savings
     - 🔒 Time-locked for growth (Minimum 1 year)
     - 📈 Potential 2% yield boost after 10 years
     - 🎯 Withdrawals available after retirement age

7. **Recent Transactions**
   - Dark green card
   - Title: "Recent Transactions"
   - Currently shows placeholder: "No transactions yet"

## Key Features Explained

### 💼 Long-term Retirement Savings
The Pension Nest is designed for long-term wealth accumulation. Users can make regular deposits to build their retirement fund over time.

**User Benefit**: Dedicated space for retirement savings, separate from daily spending money.

### 🔒 Time-locked for Growth (Minimum 1 year)
Funds deposited into the Pension Nest are locked for a minimum of 1 year to encourage consistent, long-term saving habits.

**Implementation Note**: Currently, the withdrawal button is completely disabled. In a future version, this could be enhanced to check account age or deposit dates.

**User Benefit**: Prevents impulsive withdrawals, ensuring retirement funds stay intact.

### 📈 Potential 2% Yield Boost After 10 Years
Users who maintain their Pension Nest for 10+ years may be eligible for a 2% yield boost on their balance.

**Implementation Note**: This is currently a marketing feature. Future versions could integrate with actual yield calculation logic.

**User Benefit**: Incentive for long-term commitment to retirement planning.

### 🎯 Withdrawals Available After Retirement Age
Withdrawals from the Pension Nest become available once the user reaches retirement age (typically 60-65 years old).

**Implementation Note**: Currently, withdrawals are completely disabled. Future implementation would require:
1. User profile field for date of birth
2. Calculation logic to determine retirement eligibility
3. Conditional unlock of withdrawal button

**User Benefit**: Ensures funds are preserved specifically for retirement years.

## Deposit Functionality

### How It Works

1. **User clicks "💸 Deposit"**
2. **Deposit form appears** (no modal for Pension - direct input)
3. **User enters amount** (e.g., 500.00)
4. **Validation checks**:
   - Amount must be > $0
   - Amount must be ≤ $1,000,000
5. **Click "Confirm"**
6. **Two database operations**:
   - Update vault balance: `balance = balance + amount`
   - Insert transaction record: `{ amount: +500, description: "Deposit to Pension Nest" }`
7. **Success feedback**:
   - Green success message appears
   - Balance updates immediately
   - Deposit form closes
8. **Transaction recorded** in Supabase

### Example Flow

```
Initial Balance: $0.00
User deposits: $500.00
New Balance: $500.00
Transaction: +$500.00 "Deposit to Pension Nest"

User deposits: $200.00
New Balance: $700.00
Transaction: +$200.00 "Deposit to Pension Nest"
```

### Input Validation

- **Minimum**: $0.01
- **Maximum**: $1,000,000.00
- **Decimal precision**: 2 places (cents)
- **Error handling**: Clear error messages for invalid inputs

## Withdrawal Status

### Current Implementation
- **Status**: 🔒 LOCKED
- **Button State**: Disabled (gray, non-clickable)
- **Message**: "Locked until retirement"
- **Functionality**: No withdrawal allowed

### Future Implementation
To enable retirement-age withdrawals:

1. **Add birthdate field to profiles table**:
```sql
ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
```

2. **Calculate retirement eligibility**:
```javascript
const calculateRetirementEligibility = (birthDate) => {
  const today = new Date()
  const birth = new Date(birthDate)
  const age = today.getFullYear() - birth.getFullYear()
  const retirementAge = 60 // or 65, configurable
  
  return age >= retirementAge
}
```

3. **Conditionally enable withdrawals**:
```javascript
const canWithdraw = vaultType === 'pension' 
  ? calculateRetirementEligibility(profile.date_of_birth)
  : true
```

## Styling Details

### Color Palette
- **Background**: Dark green (#1B4332, #081C15)
- **Accent**: Gold (#D4AF37)
- **Text**: White, gray shades
- **Purple notice**: Purple-900 with opacity

### Key Features Section CSS
```css
bg-primary-dark        /* Dark green background */
border-2 border-gold   /* 2px gold border */
rounded-xl             /* Extra large border radius */
p-6                    /* 1.5rem padding */
space-y-3              /* 0.75rem vertical spacing */
```

### Feature Items CSS
```css
flex items-start gap-3   /* Flex layout with icon-text gap */
text-2xl                 /* Large emoji icons */
text-white text-sm pt-1  /* White text, small size, top padding */
```

### Responsive Design
- **Mobile**: Single column, full width
- **Tablet**: Two-column button grid
- **Desktop**: Constrained to max-w-4xl container

## Testing Guide

### Manual Testing Steps

#### Test 1: Navigation to Pension Vault
1. Log in to your account
2. From Dashboard, click the **Pension Nest** card (purple gradient)
3. ✅ Verify you're navigated to `/vault/pension`
4. ✅ Verify page shows "Pension Nest" title with 🏦 icon

#### Test 2: Balance Display
1. Check the balance section
2. ✅ Verify it shows current balance in USD format
3. ✅ Verify balance is gold text on dark green background

#### Test 3: Deposit Functionality
1. Click **"💸 Deposit"** button
2. ✅ Verify deposit form appears directly (NO modal)
3. Enter amount: `100.00`
4. Click **"Confirm"**
5. ✅ Verify success message appears
6. ✅ Verify balance increases by $100.00
7. Check Supabase transactions table
8. ✅ Verify transaction record: `{ amount: 100, description: "Deposit to Pension Nest" }`

#### Test 4: Withdrawal Locked Status
1. Check the withdrawal button area
2. ✅ Verify button shows "🔒 Locked until retirement"
3. ✅ Verify button is gray and disabled
4. Try to click it
5. ✅ Verify nothing happens (cursor shows not-allowed)

#### Test 5: Informational Notices
1. Scroll down to see the purple notice
2. ✅ Verify it explains time-lock policy
3. ✅ Verify "Key Features" section appears below
4. ✅ Verify all 4 features are visible with emoji icons

#### Test 6: Key Features Section
1. Check the "Key Features" section
2. ✅ Verify title "Key Features" in gold
3. ✅ Verify dark green background with gold border
4. ✅ Verify 4 features listed:
   - 💼 Long-term retirement savings
   - 🔒 Time-locked for growth (Minimum 1 year)
   - 📈 Potential 2% yield boost after 10 years
   - 🎯 Withdrawals available after retirement age
5. ✅ Verify mobile-responsive (check on smaller screen)

#### Test 7: Multiple Deposits
1. Deposit $50.00
2. Deposit $75.00
3. Deposit $25.00
4. ✅ Verify balance updates correctly each time
5. ✅ Verify 3 transaction records in Supabase

## Database Schema

### Vaults Table
```sql
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_type TEXT NOT NULL CHECK (vault_type IN ('micro_savings', 'emergency', 'pension')),
  balance DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, vault_type)
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Code Implementation

### VaultDetail.jsx - Key Features Section
```jsx
{vaultType === 'pension' && (
  <div className="mt-6 bg-primary-dark border-2 border-gold rounded-xl p-6">
    <h4 className="text-xl font-bold text-gold mb-4">Key Features</h4>
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">💼</span>
        <p className="text-white text-sm pt-1">Long-term retirement savings</p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔒</span>
        <p className="text-white text-sm pt-1">Time-locked for growth (Minimum 1 year)</p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-2xl">📈</span>
        <p className="text-white text-sm pt-1">Potential 2% yield boost after 10 years</p>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎯</span>
        <p className="text-white text-sm pt-1">Withdrawals available after retirement age</p>
      </div>
    </div>
  </div>
)}
```

### Conditional Rendering Logic
```javascript
const info = getVaultInfo(vaultType)

// Withdrawal button logic
{info.canWithdraw ? (
  <button onClick={() => setShowWithdrawForm(true)}>
    💵 Withdraw
  </button>
) : (
  <div className="bg-gray-700 text-gray-400 cursor-not-allowed">
    🔒 Locked until retirement
  </div>
)}
```

### Vault Info Configuration
```javascript
const getVaultInfo = (type) => {
  const info = {
    pension: {
      name: 'Pension Nest',
      icon: '🏦',
      description: 'Locked until retirement for your future security',
      canWithdraw: false,  // ← Disables withdrawal button
    },
    // ... other vaults
  }
  return info[type] || {}
}
```

## User Experience Flow

### First-Time User Journey
1. **Sign up** for WealthNest account
2. **Automatic vault creation**: 3 vaults including Pension Nest
3. **Navigate to Dashboard**: See Pension Nest card with $0.00 balance
4. **Click Pension Nest card**: Open dedicated vault page
5. **Read Key Features**: Understand pension vault benefits
6. **Make first deposit**: Click Deposit, enter amount, confirm
7. **See balance update**: Immediate feedback, funds added
8. **Return to Dashboard**: See updated balance on Pension Nest card

### Regular User Flow
1. **Log in** to WealthNest
2. **Dashboard overview**: Check all vault balances
3. **Click Pension Nest**: Open vault page
4. **Make regular deposits**: Weekly, monthly, or as desired
5. **Track growth**: Watch balance increase over time
6. **Plan for retirement**: See features describing long-term benefits

## Future Enhancements

### Phase 1: Basic Improvements
- [ ] Transaction history display (show recent deposits)
- [ ] Total deposits calculator (sum of all deposits)
- [ ] Growth chart (visualize balance over time)
- [ ] Deposit frequency suggestions (weekly, monthly)

### Phase 2: Time-Lock Implementation
- [ ] Add date_of_birth to user profile
- [ ] Calculate account age
- [ ] Implement 1-year minimum lock
- [ ] Show unlock countdown timer
- [ ] Enable withdrawals after minimum period

### Phase 3: Retirement Age Features
- [ ] Age verification on signup
- [ ] Retirement age calculator (based on country/region)
- [ ] Conditional unlock at retirement age
- [ ] Partial withdrawal options (percentage-based)

### Phase 4: Yield System
- [ ] Track deposit dates
- [ ] Calculate account tenure
- [ ] Implement 2% yield boost after 10 years
- [ ] Display projected yield on dashboard
- [ ] Automatic yield application

### Phase 5: Advanced Features
- [ ] Beneficiary designation
- [ ] Employer contribution matching
- [ ] Tax-advantaged status (region-specific)
- [ ] Investment portfolio options
- [ ] Retirement planning calculator

## Related Files

- **src/pages/VaultDetail.jsx** - Main vault component
- **src/pages/Dashboard.jsx** - Vault cards with links
- **replit.md** - Project documentation
- **supabase_schema.sql** - Database schema
- **tailwind.config.js** - Custom color configuration

## Commit Information

**Commit Message:**
```
feat: Set up basic Pension Nest page structure and display

- Added Key Features section with descriptive content
- Features include time-lock info, yield boost, and retirement withdrawal details
- Styled with dark green background and gold border
- Deposit functionality working for pension vault
- Withdrawal button shows locked status as designed
- Mobile-responsive flex layout
```

## Support & Troubleshooting

### Issue: Pension vault not showing on Dashboard
**Solution**: Run the SQL schema in Supabase SQL Editor. The trigger creates all 3 vaults on signup.

### Issue: Deposit button not working
**Solution**: Check browser console for errors. Verify Supabase connection and environment variables.

### Issue: Key Features section not visible
**Solution**: Ensure you're on the pension vault page (/vault/pension). Features only show for pension vault type.

### Issue: Balance not updating after deposit
**Solution**: Check Supabase RLS policies. Ensure user has permission to update their own vaults.

## Accessibility

- Large touch targets (py-4 px-6) for mobile users
- Clear visual hierarchy with headings and sections
- High contrast text (white/gold on dark green)
- Disabled state clearly communicated (gray, non-clickable)
- Emoji icons provide visual cues
- Descriptive text for screen readers

## Performance

- Lazy loading: Components only render when needed
- Optimistic UI updates: Balance updates immediately
- Single database queries: Efficient Supabase calls
- Hot module replacement: Fast development iteration
- Mobile-first CSS: Minimal media query overhead

# 💰 WealthNest - Super Wallet PWA

A mobile-first Progressive Web App designed for unbanked and underbanked populations in emerging markets. Build your financial future with three specialized vaults.

## 🎯 Features

- **💰 Micro-Savings Vault** - Build wealth little by little through daily savings
- **🛡️ Emergency Vault** - Create a financial safety net for unexpected events
- **🏦 Pension Nest** - Secure your retirement with time-locked savings
- **🔐 Secure Authentication** - Powered by Supabase Auth
- **💸 Deposit Functionality** - Add funds to any vault with real-time updates
- **📱 Mobile-First Design** - Optimized for emerging market users
- **🎨 Professional Fintech Styling** - Dark forest green (#1B4332) + Gold accents (#D4AF37)

## 🚀 Quick Start

### ⚠️ IMPORTANT: Database Setup Required First!

**The app will not work until you set up the Supabase database!**

If you see **"Unable to load your vaults"** after signup, you haven't completed the database setup yet.

📖 **See [QUICK_START.md](QUICK_START.md) for complete step-by-step instructions**

### Quick Setup Checklist

1. ✅ Create a Supabase project at [supabase.com](https://supabase.com)
2. ✅ Open SQL Editor in Supabase dashboard
3. ✅ Copy **all 91 lines** from `supabase_schema.sql`
4. ✅ Paste and click **RUN** in Supabase SQL Editor
5. ✅ Verify you see: "Success. No rows returned"
6. ✅ Add Supabase credentials to Replit Secrets (if not already done)
7. ✅ Sign up and enjoy your vaults!

## 📁 Project Structure

```
WealthNest/
├── src/
│   ├── components/          # Reusable components
│   │   └── ProtectedRoute.jsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.jsx
│   ├── lib/                 # Utilities and configs
│   │   └── supabaseClient.js
│   ├── pages/               # Page components
│   │   ├── Splash.jsx       # Landing page
│   │   ├── Login.jsx        # User login
│   │   ├── Signup.jsx       # User registration
│   │   ├── Dashboard.jsx    # Vault overview
│   │   └── VaultDetail.jsx  # Individual vault
│   ├── App.jsx              # Main app router
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── supabase_schema.sql      # ⚠️ RUN THIS IN SUPABASE!
├── DATABASE_SETUP.md        # Detailed setup guide
├── QUICK_START.md           # Fast setup instructions
├── DEPOSIT_FEATURE.md       # Deposit functionality docs
└── replit.md                # Project architecture
```

## 🛠 Technology Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS with custom fintech theme
- **Backend:** Supabase (Authentication + PostgreSQL)
- **Routing:** React Router DOM v6
- **Deployment:** Replit (configured for port 5000)

## 📖 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Complete setup guide (START HERE!)
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Detailed database instructions
- **[DEPOSIT_FEATURE.md](DEPOSIT_FEATURE.md)** - How deposits work
- **[replit.md](replit.md)** - Technical architecture and preferences

## 🐛 Troubleshooting

### "Unable to load your vaults" after signup
**Cause:** Database tables haven't been created yet  
**Solution:** 
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the sidebar
3. Create a new query
4. Copy **all** of `supabase_schema.sql` (91 lines)
5. Paste and click **RUN**
6. You should see: "Success. No rows returned"

### "Could not find the table" error in browser console
**Cause:** Same as above - tables don't exist  
**Solution:** Run the SQL schema in Supabase SQL Editor

### "No vaults found" but no error message
**Cause:** Database trigger didn't fire or failed  
**Solution:** 
1. Verify the trigger exists in Supabase (check Functions section)
2. Check Supabase logs for errors
3. Try creating vaults manually via SQL Editor

### Email confirmation required after signup
**Cause:** Email confirmation is enabled in Supabase  
**Solutions:**
- **Option A:** Check your email for the confirmation link
- **Option B:** Disable email confirmation for testing:
  1. Go to Supabase > Authentication > Providers
  2. Click on Email
  3. Toggle off "Confirm email"
  4. Save changes

### Server not starting or port 5000 in use
**Solution:** Restart the workflow from Replit's interface

## 🎨 Design System

### Colors
- **Primary:** Dark Forest Green (`#1B4332`, `#081C15`, `#2D6A4F`)
- **Accent:** Gold (`#D4AF37`, `#F4E4A6`, `#B8941F`)
- **Background:** Deep Green (`#081C15`)

### Typography
- System fonts for optimal mobile performance
- Clear hierarchy with bold headings
- Accessible contrast ratios for readability

## 🔒 Security Features

- ✅ Row Level Security (RLS) policies on all database tables
- ✅ Automatic profile and vault creation via database triggers
- ✅ Secure authentication with Supabase Auth
- ✅ Environment variables for API keys (never committed to git)
- ✅ Users can only access their own data
- ✅ SQL injection prevention via Supabase client

## 📱 Features Status

### ✅ Implemented
- [x] User authentication (signup, login, logout)
- [x] Protected routes for authenticated pages
- [x] Three vault types with automatic creation
- [x] Dashboard with vault overview
- [x] Individual vault detail pages
- [x] Deposit functionality with validation
- [x] Real-time balance updates
- [x] Transaction history recording
- [x] Mobile-first responsive design
- [x] Professional fintech styling

### 🚧 Coming Soon
- [ ] Withdrawal functionality
- [ ] Transaction history display
- [ ] Pension vault time-lock (age-based withdrawal restrictions)
- [ ] Biometric authentication
- [ ] Offline support (PWA features)
- [ ] Push notifications
- [ ] Multi-currency support
- [ ] Goal setting and tracking

## 🤝 Contributing

This is a demo project. Feel free to fork and customize for your needs!

## 📄 License

MIT License - Feel free to use this project as a template

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Supabase](https://supabase.com/) - Backend and authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [React Router](https://reactrouter.com/) - Routing
- [Replit](https://replit.com/) - Development platform

---

**🆘 Need help?** 
- Quick setup: [QUICK_START.md](QUICK_START.md)
- Database issues: [DATABASE_SETUP.md](DATABASE_SETUP.md)
- Feature docs: [DEPOSIT_FEATURE.md](DEPOSIT_FEATURE.md)

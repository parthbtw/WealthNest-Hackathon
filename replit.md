# WealthNest - Mobile-First Progressive Web App

## Overview
WealthNest is a mobile-first Progressive Web App (PWA) designed to provide accessible financial tools to unbanked and underbanked populations in emerging markets. It offers robust savings, emergency preparedness, and long-term retirement planning capabilities through three distinct vault types: Micro-Savings, Emergency, and Pension Nest. The project aims to empower users with a user-friendly interface for managing their finances.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, so please break down tasks into smaller, manageable steps. Ask before making major changes to the project's architecture or core features. I value a detailed understanding of the code, so please provide thorough explanations for any complex implementations. Ensure all changes align with the existing fintech styling (dark forest green and gold theme).

## System Architecture
WealthNest is a mobile-first PWA built with React 18 and Vite for the frontend, styled using Tailwind CSS with a custom dark forest green and gold fintech theme. Supabase provides the backend, including authentication and a PostgreSQL database. React Router DOM v6 handles client-side routing.

**UI/UX Decisions:**
- Adheres to a dark forest green and gold color scheme for a consistent fintech aesthetic.
- Components like the Total Balance Display Card are designed with a credit card-style appearance.
- Mobile-first approach ensures responsiveness across devices.
- Clear display of financial information, including visual progress bars for goals and detailed transaction breakdowns.

**Technical Implementations & Feature Specifications:**
- **Authentication:** Standard user signup, login, and logout with automatic profile and vault creation. Each user receives a unique 6-digit WealthNest ID.
- **Vault Management:** Three vault types (Micro-Savings, Emergency, Pension Nest) with deposit and withdrawal capabilities.
    - **Micro-Savings:** Supports deposit via Money Exchange Partners or WealthNest Wallet Top Up.
    - **Emergency Vault:** Features a visual-only micro-insurance toggle (UI demo). Includes a 0.5% withdrawal fee. A demo "Annual Parking Incentive" of 0.25% of balance can be applied.
        - **Internal Transfer from Micro-Savings:** Users can deposit to Emergency Vault directly from their Micro-Savings vault via a dedicated transfer button and modal. The transfer uses an atomic RPC function (`transfer_to_emergency_from_microsavings`) that validates balance, updates both vaults, and records transactions.
    - **Pension Nest:** Requires users to set a target retirement year (minimum 10 years out). On first deposit, `vesting_start_date` and `locked_until` (1 year from deposit) are set.
        - **Internal Transfer from Micro-Savings:** Users can deposit to Pension Nest directly from their Micro-Savings vault via a dedicated transfer button and modal. The transfer uses an atomic RPC function (`transfer_to_pension_from_microsavings`) that validates balance, updates both vaults, records transactions, and automatically handles first-deposit logic (setting vesting and lock dates).
        - **Full Withdrawal:** Conditional on 1-year lock period, 10 years vested, and target year reached. A 2% bonus is awarded if both 10 years vested and target year reached. Withdrawal resets the vault.
- **WealthAI Chat Interface:** A simulated AI financial assistant provides keyword-based responses, including balance fetching and financial advice.
- **One-Click Transfers:** Peer-to-peer transfers from Micro-Savings vault using either recipient's WealthNest ID (6-digit) or email address. Includes validation for input and prevents self-transfers. Uses atomic RPC function for consistency.
- **Smart Goal Tracking:** Create, edit, delete, and track financial goals with visual progress and fund allocation from Micro-Savings via atomic transactions.
- **Total Balance Display:** Aggregates balances from all vaults on the Dashboard with real-time updates.

**System Design Choices:**
- **Database Schema:** `profiles`, `vaults`, `transactions`, and `goals` tables with Row-Level Security (RLS). `profiles` includes `pension_target_year`; `vaults` includes `locked_until` and `vesting_start_date`.
- **Atomic Transactions:** Critical operations use PostgreSQL RPC functions to ensure data consistency and prevent race conditions.
- **Error Handling & Feedback:** Comprehensive validation, user-friendly error messages, and success notifications.

## External Dependencies
- **Supabase:** Backend services (authentication, PostgreSQL database, Realtime).
- **React Router DOM v6:** Client-side routing.
- **Vite:** Frontend build tool.
- **Tailwind CSS:** Utility-first CSS for styling and custom theming.
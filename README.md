# SpendWise - Offline Expense Tracker

A privacy-first, offline expense tracker for Android that automatically reads and categorizes financial SMS messages (bank, UPI, cards) using on-device ML Kit. Built with React Native, Expo, and SQLite.

## Features

### Automatic SMS Transaction Import
- **Smart SMS Parsing**: Automatically detects and extracts transaction details from bank, UPI, and wallet SMS messages
- **ML Kit Integration**: Uses Google's on-device ML Kit for intelligent entity extraction (amounts, dates, merchants)
- **Real-time Sync**: Listens for new SMS messages and automatically imports transactions in real-time
- **Initial Import**: One-time bulk import of existing SMS messages on first launch
- **Deduplication**: Smart hash-based deduplication prevents duplicate transactions

### Transaction Management
- **Unified Timeline**: View all transactions in a chronological list with search and filters
- **Transaction Types**: Supports expense, income, refund, and transfer types
- **Manual Entry**: Add transactions manually when SMS import isn't available
- **Edit & Delete**: Full CRUD operations for all transactions
- **Transaction Linking**: Link refunds to original transactions for better tracking
- **Exclude Transactions**: Hide specific transactions from calculations without deleting them
- **SMS Preview**: View original SMS message that generated the transaction

### Categories & Organization
- **Default Categories**: Pre-configured categories (Food, Groceries, Transport, Shopping, Bills, Entertainment, Health, Travel, Salary, Other)
- **Custom Categories**: Create and manage your own categories with custom icons and colors
- **Category Icons**: Visual category identification with Lucide icons

### Budgeting
- **Monthly Budgets**: Set overall monthly spending limits
- **Budget Tracking**: Visual progress indicators showing spending vs budget
- **Budget Alerts**: Notifications when approaching budget limits

### Bills & Payments
- **Bill Detection**: Automatically detects bill reminders and payment due dates from SMS
- **Bill Management**: Track unpaid and paid bills
- **Bill Linking**: Link bill payments to transactions for complete tracking
- **Due Date Tracking**: Never miss a payment with due date reminders

### Analytics & Insights
- **Monthly Trends**: Line chart showing spending patterns over time
- **Category Breakdown**: Pie chart visualization of spending by category
- **Performance Summary**: Compare current month spending vs previous month
- **Merchant Analysis**: Track spending by merchant/payee

### Data Management
- **Local SQLite Database**: All data stored locally for privacy and offline access
- **Export Data**: Export all transactions and categories as JSON
- **Import Data**: Restore data from JSON backup files
- **Clear All Data**: Option to wipe all data and start fresh

### Customization
- **Multi-Currency Support**: Support for multiple currencies (USD, INR, EUR, and more)
- **Dark/Light Theme**: Automatic and manual theme switching
- **Localization**: Currency symbols based on device locale

### App Updates
- **Version Check**: Automatic check for app updates
- **In-app Updates**: Notification when new version is available on Play Store

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **State Management**: Zustand
- **Database**: SQLite (expo-sqlite)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Charts**: react-native-gifted-charts
- **Icons**: Lucide React Native
- **Animations**: React Native Reanimated
- **ML/AI**: Google ML Kit (on-device entity extraction)
- **Authentication**: Firebase Auth + Google Sign-In
- **Cloud Storage**: Google Drive API

## Project Structure

```
spendwise/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── IconLoader.tsx
│   │   └── UpdateModal.tsx
│   ├── constants/         # App constants (currencies, etc.)
│   ├── context/           # React context providers
│   ├── db/                # Database initialization and management
│   ├── navigation/        # Navigation configuration
│   ├── screens/           # Main app screens
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── AddTransactionScreen.tsx
│   │   ├── Analysis.tsx
│   │   └── Settings.tsx
│   ├── store/             # Zustand stores
│   │   ├── useExpenseStore.ts
│   │   ├── useAuthStore.ts
│   │   └── useThemeStore.ts
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
│       ├── smsParser.ts   # SMS parsing logic
│       ├── smsReader.ts   # SMS reading permissions & native bridge
│       ├── backupService.ts
│       ├── googleAuth.ts
│       ├── versionCheckService.ts
│       └── constants.ts
├── android/               # Android native code
├── ios/                   # iOS native code
├── assets/                # App icons and images
└── scripts/               # Build scripts
```

## Database Schema

### Tables

- **categories**: id, name, icon, color
- **transactions**: id, category_id, amount, type, kind, date, note, source_message_id, merchant, currency, account_ref, reference_id, raw_sender, is_excluded, parent_id
- **messages**: id, sender, body, received_at, hash, parse_confidence, processed_status
- **budgets**: id, category_id, period_type, limit_amount, start_date
- **bills**: id, sender, body, amount, due_date, status, category_id, transaction_id
- **app_meta**: key, value (for app settings and setup status)

## Getting Started

### Prerequisites
- Node.js
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd spendwise
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Run on Android
```bash
npm run android
```

5. Run on iOS
```bash
npm run ios
```

### Building for Production

**Android APK (Preview)**
```bash
npm run android:apk
```

**Android AAB (Production)**
```bash
npm run android:aab
```

**Local Android Build**
```bash
npm run local:apk    # APK
npm run local:aab    # AAB
```

## Permissions

The app requires the following permissions on Android:
- **READ_SMS**: To read financial SMS messages
- **RECEIVE_SMS**: To listen for new SMS messages in real-time

## Privacy

- All SMS processing happens locally on the device
- No SMS data is sent to external servers
- ML Kit entity extraction runs entirely on-device
- Optional Google Drive backup is user-initiated

## License

MIT License - see LICENSE file for details
   - monthly total budget
   - category-level budget alerts
4. **Dashboard**
   - total spent this month
   - category-wise breakdown
   - debit vs credit summary
5. **Recurring transactions** (basic scheduler/reminder)
6. **Reports**
   - monthly and weekly summaries
   - top merchants/categories
7. **Backup/restore**
   - local export/import (JSON/CSV)
8. **Data privacy controls**
   - app lock (PIN/biometric)
   - hide sensitive values in UI (optional mask)
9. **Error correction flow**
   - review low-confidence parses and fix quickly

## 6) SMS Parsing Strategy

### Rule-Based First (v1)

- Build provider-specific regex templates for major banks/UPI formats.
- Fallback to generic patterns:
  - amount detection (`Rs`, `INR`, decimal formats),
  - transaction verbs (`debited`, `credited`, `sent`, `received`, `paid`),
  - merchant extraction heuristics.
- Add confidence scoring:
  - high: auto-create transaction
  - medium/low: push to "Needs Review"

### Improvements (v2+)

- On-device ML classifier for transaction message detection.
- Learning from user corrections to improve parsing rules.

## 7) UX Flow

1. Welcome -> permission explanation -> grant SMS permission.
2. Initial scan/import -> "X transactions found".
3. Show dashboard + full transaction list.
4. Prompt for category cleanup and monthly budget setup.
5. Ongoing: background import + review queue for uncertain parses.

## 8) Security and Compliance

- Process SMS content on device where possible.
- Encrypt local database at rest (if available in chosen stack).
- Avoid storing full SMS body if not needed after extraction (configurable retention).
- Provide clear privacy policy and consent language.

## 9) Performance and Reliability

- Batch SMS reads to avoid UI freezes.
- Use background worker for import/parsing.
- Keep parsing idempotent and deduped (message hash + sender + timestamp checks).
- Add telemetry (local logs) for parse failures.

## 10) Testing Plan

- Unit tests:
  - parser regex for multiple bank/UPI formats
  - dedupe logic
  - budget calculations
- Integration tests:
  - SMS import -> parse -> transaction saved -> UI displayed
- UI tests:
  - filter/search behavior
  - onboarding and permission states
- Edge cases:
  - multilingual SMS, malformed amounts, duplicate alerts, time zone/date formats

## 11) Milestone Plan

### Phase 0 - Foundation (Week 1)

- Project setup, local DB schema, repository pattern, basic navigation.

### Phase 1 - SMS Ingestion + Parser MVP (Weeks 2-3)

- SMS permission flow, inbox scan, rule-based parser, dedupe.

### Phase 2 - Transactions Experience (Weeks 4-5)

- Transaction list/details, search/filter, manual edit/add.

### Phase 3 - Core Expense Features (Weeks 6-7)

- Categories, budgets, dashboard, reports.

### Phase 4 - Hardening (Week 8)

- Backup/restore, app lock, performance fixes, testing and bug bash.

## 12) Definition of Done (v1)

- App imports and parses transaction SMS on Android with acceptable accuracy.
- User can see all transactions and edit incorrect ones.
- Budgeting, categorization, dashboard, and basic reports are available.
- App works offline with stable performance and clear privacy controls.

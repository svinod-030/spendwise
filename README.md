# offline-expense-tracker

## Implementation Plan

This document outlines how to build an offline-first expense tracker that:
- reads transaction-related SMS messages from the device,
- extracts and shows all transactions,
- includes must-have features expected in a production-ready expense tracker.

## 1) Product Goals

- Parse financial SMS messages (bank, UPI, card, wallet) into structured transactions.
- Provide a single transaction timeline with search and filters.
- Work reliably offline, with local-first storage and optional sync later.
- Give users clear budget visibility and spending insights.

## 2) Scope and Assumptions

- Platform: Android first (SMS access is practical and permission-driven on Android).
- iOS note: direct SMS inbox access is restricted; use manual import/push/email alternatives in future.
- Default storage: on-device database (no required cloud dependency for v1).
- Privacy-first approach: keep SMS processing local by default.

## 3) Architecture (High Level)

### Client App Layers

1. **Permissions + SMS Reader**
   - Request and manage SMS read permission.
   - Read existing inbox history and observe new incoming SMS.

2. **Message Processing Pipeline**
   - Normalize SMS text.
   - Detect whether message is transaction-related.
   - Extract fields: amount, debit/credit, merchant/payee, account hint, reference id, date/time, balance (optional).
   - Confidence scoring and fallback to manual review.

3. **Transaction Engine**
   - Deduplicate entries.
   - Categorize transaction (food, bills, transport, etc.).
   - Store and index transactions.

4. **Local Data Layer**
   - SQLite (or equivalent) with migrations and indexes.
   - Repository layer for queries, filters, summaries.

5. **UI Layer**
   - Dashboard, transaction list, transaction details, budgets, reports, settings.

## 4) Data Model (Minimum)

### Core Tables

- `messages`
  - id, sender, body, received_at, hash, processed_status, parse_confidence
- `transactions`
  - id, source_message_id, type (debit/credit), amount, currency, merchant, account_ref, category_id, occurred_at, note, is_manual, created_at, updated_at
- `categories`
  - id, name, icon, color, is_default
- `budgets`
  - id, category_id (nullable for overall), period_type (monthly/weekly), limit_amount, start_date
- `accounts` (optional for v1 if account hints are available)
  - id, display_name, masked_number, provider

### Indexes

- `transactions(occurred_at)`
- `transactions(category_id, occurred_at)`
- `messages(hash)` for deduplication

## 5) Feature Requirements

### A. Read All Text Messages (Android)

- Request `READ_SMS` permission with clear onboarding copy.
- Initial import:
  - batched read of inbox/sent transaction-relevant messages,
  - progress indicator and cancel support.
- Incremental import:
  - periodic background scan for new messages,
  - optional manual "Rescan SMS" action.
- Permission denied flow:
  - show manual entry and import alternatives.

### B. Show All Transactions

- Unified timeline sorted by date/time.
- Filters:
  - date range, debit/credit, category, account, merchant, amount range.
- Search:
  - merchant, note, reference id, amount text.
- Transaction details screen:
  - original SMS preview,
  - parsed fields and edit capability.

### C. Must-Have Expense Tracker Features

1. **Manual transaction add/edit/delete**
2. **Category management** (default + custom)
3. **Budgets and alerts**
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

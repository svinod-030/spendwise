# SMS Transaction Parsing Logic

This document explains the step-by-step logic used in `smsParser.ts` to transform raw SMS messages into structured transaction data.

## 1. Early Filtering (The Gatekeepers)
Before any heavy processing happens, the message goes through several filters to ensure it's a legitimate financial transaction:
- **Null Check**: Skips if the sender or body is missing.
- **Noise Filter**: Skips messages matching `nonTransactionalPatterns` (e.g., OTPs, promotional offers, "recharge now", "claim prize").
- **Keyword Check**: Ensures the message contains at least one transaction-related keyword (e.g., `debited`, `credited`, `upi`, `spent`).
- **Type Detection**: Determines if it's an `expense` or `income`. If the message contains "exclude keywords" like `due` or `statement`, it's rejected as a transaction (though it might be processed as a bill).

## 2. Hybrid Extraction Strategy
The parser uses a hybrid approach, combining Google's ML Kit (on Android) with robust Regular Expressions (Regex) as a fallback.

### Step A: ML Kit Extraction (Android only)
The app calls a native bridge to Google's **ML Kit Entity Extraction**.
- It identifies `TYPE_MONEY` (amount) and `TYPE_DATE_TIME` (date).
- **Pros**: Very accurate at identifying currencies and values in complex sentences.
- **Cons**: Android only, requires a ~10MB model download.

### Step B: Regex Fallback (Amount)
If ML Kit is unavailable (iOS or model not loaded) or fails to find a value:
- The parser uses `amountPattern`: `/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i`.
- It normalizes the string (removing commas) to get a numeric value.

### Step C: Metadata Extraction (Regex)
Regardless of the AI result, metadata is extracted via specific patterns:
- **Merchant**: Uses a multi-layered search:
    1. **Direct Match**: Checks a list of 40+ known merchants (Blinkit, Swiggy, Amazon, etc.).
    2. **Positional Patterns**: Looks for names after keywords like `to`, `at`, `from`, or `towards`.
    3. **Cluster Analysis**: Identifies All-Caps word clusters common in bank SMSes (e.g., `ZOMATO MEDIA`).
- **Account Reference**: Extracts the last few digits of the bank account/card using `accountPattern`.
- **Reference ID**: Finds UTR or Transaction IDs using `refPattern`.

## 3. Deduplication (Hashing)
To prevent the same SMS from being recorded multiple times (e.g., if the user re-scans their inbox):
- A unique `hash` is generated using `buildHash(sender, body, timestamp)`.
- The timestamp is normalized to **seconds** to account for tiny variations in how the system reports the message time.

## 4. Confidence Scoring
Each result is assigned a confidence score:
- **0.97**: Extracted via ML Kit (High confidence).
- **0.90**: Extracted via Regex with a successful merchant match.
- **0.60**: Extracted via Regex without a clear merchant match.

## 5. Bill Parsing
A secondary function, `parseSmsForBill`, looks specifically for `due` or `outstanding` keywords. It uses the same hybrid ML/Regex strategy to find the **due date** and **amount**, creating a "Bill" entry instead of a "Transaction".

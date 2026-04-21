import { NativeModules, Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParsedTransactionType = 'expense' | 'income';
export type TransactionKind = 'expense' | 'income' | 'refund' | 'transfer';

export interface SmsMessage {
  address: string;
  body: string;
  date: number;
}

export interface ParsedSmsTransaction {
  sender: string;
  body: string;
  receivedAt: string;
  hash: string;
  amount: number;
  type: ParsedTransactionType;
  kind: TransactionKind;
  merchant?: string;
  referenceId?: string;
  accountRef?: string;
  confidence: number;
}

export interface ParsedSmsBill {
  sender: string;
  body: string;
  receivedAt: string;
  amount: number;
  dueDate?: string;
  merchant?: string;
}

// ─── ML Kit Entity result shape (returned from native bridge) ─────────────────

interface MLKitEntity {
  text: string;
  type: 'TYPE_MONEY' | 'TYPE_DATE_TIME';
  value?: number;           // only for TYPE_MONEY
  fractionalDigits?: number;
}

// ─── Native bridge ────────────────────────────────────────────────────────────

const { SMSParserModule } = NativeModules as {
  SMSParserModule?: {
    preloadModel: () => Promise<boolean>;
    extractEntities: (text: string) => Promise<MLKitEntity[]>;
  };
};

/**
 * Call once on app start to download the ~10 MB ML Kit model in the background,
 * so the first real SMS parse is instant.
 */
export async function preloadMLKitModel(): Promise<void> {
  if (Platform.OS !== 'android' || !SMSParserModule) return;
  try {
    await SMSParserModule.preloadModel();
  } catch {
    // Non-fatal — model will download lazily on first annotate call
  }
}

// ─── Keyword lists ────────────────────────────────────────────────────────────

const transactionKeywords = [
  'debited', 'credited', 'spent', 'received', 'paid', 'payment',
  'txn', 'transaction', 'upi', 'withdrawn', 'withdrew', 'deposited',
  'transfer', 'purchase', 'sent', 'added', 'neft', 'imps', 'rtgs', 'withdrawal',
];

const excludeKeywords = [
  'due', 'outstanding', 'reminder', 'generated', 'statement',
  'overdue', 'will be debited', 'payment request', 'requested a payment',
];

/** Non-transactional message patterns — skip these entirely */
const nonTransactionalPatterns = [/\botp\b/i, /bank\s*alert/i, /one.?time.?pass/i];

// ─── Regex helpers ────────────────────────────────────────────────────────────

const amountPattern = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const accountPattern = /(?:a\/c|acct|account)\s*[x*]*([0-9]{2,6})/i;
const refPattern = /(?:ref(?:erence)?(?:\s*id)?|utr|txn(?:\s*id)?)\s*[:\-]?\s*([a-z0-9\-]+)/i;

function normalizeAmount(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

function detectType(body: string): ParsedTransactionType | null {
  const lower = body.toLowerCase();
  if (excludeKeywords.some(kw => lower.includes(kw))) return null;
  if (/(debited|spent|paid|purchase|withdrawn|withdrawal|minus|taken out|sent)/.test(lower)) return 'expense';
  if (/(credited|received|deposited|refund|plus|added to)/.test(lower)) return 'income';
  if (/(transfer|neft|imps|rtgs)/.test(lower)) return 'expense';
  return null;
}

function detectKind(body: string): TransactionKind {
  const lower = body.toLowerCase();
  if (/(refund|reversed|chargeback)/.test(lower)) return 'refund';
  if (/(transfer|self transfer|neft|imps|rtgs)/.test(lower)) return 'transfer';
  if (/(credited|received|deposited)/.test(lower)) return 'income';
  return 'expense';
}

function cleanMerchant(name: string): string {
  if (!name) return '';
  const noiseWords = [
    'using', 'via', 'on', 'at', 'to', 'from', 'for', 'ref', 'id', 'date',
    'bank', 'ac', 'acct', 'available', 'bal', 'balance', 'txn', 'vpa', 'upi',
  ];
  let cleaned = name
    .replace(/(?:vpa|upi|info|id|ref|txn|a\/c|acct|acc|date).*$/i, '')
    .replace(/[*\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ');
  if (words.length > 0) {
    if (noiseWords.includes(words[0].toLowerCase()) && words.length > 1) words.shift();
    if (noiseWords.includes(words[words.length - 1].toLowerCase()) && words.length > 1) words.pop();
    cleaned = words.join(' ');
  }
  if (/^[0-9 ]+$/.test(cleaned) && cleaned.length < 4) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractMerchantViaRegex(body: string): string | undefined {
  const lower = body.toLowerCase();

  // Direct merchant keywords (highest priority)
  const directMerchants = [
    'blinkit', 'bigbasket', 'zepto', 'swiggy', 'zomato', 'uber', 'ola',
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa',
    'netflix', 'prime', 'hotstar', 'spotify', 'youtube',
    'pharmeasy', '1mg', 'apollo', 'uber eats', 'dominos',
    'makemytrip', 'goibibo', 'irctc', 'bookmyshow', 'pvr',
    'airtel', 'jio', 'vi ', 'vodafone', 'bsnl',
    'paytm', 'phonepe', 'gpay', 'google pay', 'cred',
    'tata power', 'bescom', 'mseb', 'hpcl', 'bpcl', 'shell'
  ];

  for (const merchant of directMerchants) {
    if (lower.includes(merchant)) {
      return merchant.charAt(0).toUpperCase() + merchant.slice(1).toLowerCase();
    }
  }

  // Pattern 1: to/at/from/towards <Merchant> (on|for|using|…)
  const toAtMatch = body.match(
    /(?:to|at|from|towards)\s+([A-Za-z0-9 .&'-]{2,50}?)\s+(?:on|for|using|via|ref|id|balance|bal|date|is|at|towards|$)/i
  );

  // Pattern 2: info/memo/vpa field
  const infoMatch = body.match(/(?:info|memo|vpa|upi)[:*]?\s*([A-Za-z0-9 .&'-]{2,40})/i);

  // Pattern 3: all-caps word cluster (common in bank SMSes) - but filter out common noise
  const capsMatch = body.match(/([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*){0,2})/g);
  let bestCapsMatch: string | undefined;
  if (capsMatch) {
    const noiseWords = ['SMS', 'MSG', 'REF', 'ID', 'TXN', 'UPI', 'NEFT', 'IMPS', 'RTGS', 'ATM', 'POS', 'ECOM', 'A/C', 'ACCT', 'BAL', 'AVAIL'];
    for (const match of capsMatch) {
      if (match.length >= 3 && !noiseWords.some(w => match.toUpperCase().includes(w))) {
        bestCapsMatch = match;
        break;
      }
    }
  }

  let merchant = toAtMatch?.[1] || infoMatch?.[1];
  if (!merchant || merchant.length < 3) merchant = merchant || bestCapsMatch;

  return merchant ? cleanMerchant(merchant) || undefined : undefined;
}

export function buildHash(sender: string, body: string, date: number): string {
  // Normalize sender (remove non-alphanumeric like +) and body (trim)
  const cleanSender = (sender || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const cleanBody = (body || "").trim();
  // Use seconds instead of ms to avoid small drift between intent and inbox
  const cleanDate = Math.floor(date / 1000);
  const key = `${cleanSender}|${cleanBody}|${cleanDate}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return `msg_${Math.abs(hash)}`;
}

/**
 * Async version of bill parser — uses ML Kit (Android) with Regex fallback.
 */
export async function parseSmsForBill(sms: SmsMessage): Promise<ParsedSmsBill | null> {
  const body = sms.body.toLowerCase();
  const billKeywords = ['due', 'outstanding', 'reminder', 'overdue'];
  if (!billKeywords.some(kw => body.includes(kw))) return null;

  // ── 1. Try ML Kit (Android only) ──────────────────────────────────────────
  let aiAmount: number | null = null;
  let aiDueDate: string | null = null;

  if (Platform.OS === 'android' && SMSParserModule) {
    try {
      const entities = await SMSParserModule.extractEntities(sms.body);
      const money = entities.find(e => e.type === 'TYPE_MONEY');
      const date = entities.find(e => e.type === 'TYPE_DATE_TIME');

      if (money?.value != null && money.value > 0) aiAmount = money.value;
      if (date?.text) {
        // Try to parse the date text extracted by AI
        const parsed = new Date(date.text.trim());
        if (!isNaN(parsed.getTime())) {
          // Normalize year if AI extracted something like "24" instead of "2024"
          if (parsed.getFullYear() < 100) parsed.setFullYear(2000 + parsed.getFullYear());
          aiDueDate = parsed.toISOString();
        }
      }
    } catch {
      // AI failed — fall through
      console.log('AI failed for bill parsing — fall through');
    }
  }

  // ── 2. Regex fallback for amount ──────────────────────────────────────────
  let amount = aiAmount;
  if (!amount) {
    const amountMatch = sms.body.match(amountPattern);
    if (!amountMatch) return null;
    amount = normalizeAmount(amountMatch[1]);
  }

  // ── 3. Regex fallback for due date ────────────────────────────────────────
  let dueDate = aiDueDate;
  if (!dueDate) {
    const dateStrPattern =
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}/i;
    const patterns = [
      new RegExp(`(?:due|by|on)\\s*[:\\s]*(${dateStrPattern.source})`, 'i'),
      new RegExp(`(${dateStrPattern.source})`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = sms.body.match(pattern);
      if (match?.[1]) {
        const parsed = new Date(match[1].trim());
        if (!isNaN(parsed.getTime())) {
          if (parsed.getFullYear() < 100) parsed.setFullYear(2000 + parsed.getFullYear());
          dueDate = parsed.toISOString();
          break;
        }
      }
    }
    // Final fallback to message date if no date found at all
    if (!dueDate) dueDate = new Date(sms.date).toISOString();
  }

  return {
    sender: sms.address,
    body: sms.body,
    receivedAt: new Date(sms.date).toISOString(),
    amount,
    dueDate,
    merchant: cleanMerchant(sms.address),
  };
}

// ─── Main hybrid transaction parser ──────────────────────────────────────────

/**
 * Async version — uses ML Kit (Android) with Regex fallback for amount/date.
 * This is the preferred entry point for processing incoming SMS messages.
 */
export async function parseSmsForTransaction(
  message: SmsMessage
): Promise<ParsedSmsTransaction | null> {
  const sender = message.address?.trim();
  const body = message.body?.trim();
  if (!sender || !body) return null;

  // Skip OTP / bank-alert / non-transactional messages early
  if (nonTransactionalPatterns.some(p => p.test(body))) return null;
  const lower = body.toLowerCase();
  if (!transactionKeywords.some(kw => lower.includes(kw))) return null;

  const type = detectType(body);
  if (!type) return null;

  // ── 1. Try ML Kit (Android only) ──────────────────────────────────────────
  let aiAmount: number | null = null;
  let aiDate: string | null = null;

  if (Platform.OS === 'android' && SMSParserModule) {
    try {
      const entities = await SMSParserModule.extractEntities(body);

      const money = entities.find(e => e.type === 'TYPE_MONEY');
      const date = entities.find(e => e.type === 'TYPE_DATE_TIME');

      if (money?.value != null && money.value > 0) aiAmount = money.value;
      if (date) aiDate = date.text;
    } catch {
      // AI failed — fall through to Regex
      console.log('AI failed — fall through to Regex');
    }
  }

  // ── 2. Regex fallback for amount ──────────────────────────────────────────
  let amount = aiAmount;
  if (!amount) {
    const amountMatch = body.match(amountPattern);
    if (!amountMatch) return null;
    amount = normalizeAmount(amountMatch[1]);
  }
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // ── 3. Accuracy audit (dev mode) ─────────────────────────────────────────
  if (__DEV__ && aiAmount != null) {
    const regexMatch = body.match(amountPattern);
    const regexAmount = regexMatch ? normalizeAmount(regexMatch[1]) : null;
    if (regexAmount != null && Math.abs(aiAmount - regexAmount) > 0.01) {
      console.warn('[SMSParser] Amount mismatch — AI:', aiAmount, ' Regex:', regexAmount, '\nBody:', body);
    }
  }

  // ── 4. Regex for merchant & metadata ─────────────────────────────────────
  const merchant = extractMerchantViaRegex(body);
  const accountMatch = body.match(accountPattern);
  const refMatch = body.match(refPattern);

  return {
    sender,
    body,
    receivedAt: new Date(message.date).toISOString(),
    hash: buildHash(sender, body, message.date),
    amount,
    type,
    kind: detectKind(body),
    merchant: (merchant && merchant.length > 2) ? merchant : undefined,
    referenceId: refMatch?.[1]?.trim(),
    accountRef: accountMatch?.[1]?.trim(),
    confidence: aiAmount != null ? 0.97 : (merchant ? 0.9 : 0.6),
  };
}

/**
 * Synchronous version — pure Regex, no async, used for batch pre-processing
 * where awaiting every message is too expensive.
 * Falls back gracefully when ML Kit is unavailable.
 */
export function parseSmsForTransactionSync(message: SmsMessage): ParsedSmsTransaction | null {
  const sender = message.address?.trim();
  const body = message.body?.trim();
  if (!sender || !body) return null;

  if (nonTransactionalPatterns.some(p => p.test(body))) return null;

  const lower = body.toLowerCase();
  if (!transactionKeywords.some(kw => lower.includes(kw))) return null;

  const amountMatch = body.match(amountPattern);
  const type = detectType(body);
  if (!amountMatch || !type) return null;

  const amount = normalizeAmount(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const merchant = extractMerchantViaRegex(body);
  const accountMatch = body.match(accountPattern);
  const refMatch = body.match(refPattern);

  return {
    sender,
    body,
    receivedAt: new Date(message.date).toISOString(),
    hash: buildHash(sender, body, message.date),
    amount,
    type,
    kind: detectKind(body),
    merchant: (merchant && merchant.length > 2) ? merchant : undefined,
    referenceId: refMatch?.[1]?.trim(),
    accountRef: accountMatch?.[1]?.trim(),
    confidence: merchant ? 0.9 : 0.6,
  };
}

export type ParsedTransactionType = "expense" | "income";
export type TransactionKind = "expense" | "income" | "refund" | "transfer";

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

const transactionKeywords = [
  "debited",
  "credited",
  "spent",
  "received",
  "paid",
  "payment",
  "txn",
  "transaction",
  "upi",
  "withdrawn",
  "withdrew",
  "deposited",
  "transfer",
  "purchase",
  "sent",
  "added",
  "neft",
  "imps",
  "rtgs",
  "withdrawal",
];

const excludeKeywords = [
  "due",
  "outstanding",
  "reminder",
  "generated",
  "statement",
  "overdue",
  "will be debited",
  "payment request",
  "requested a payment",
];

const amountPattern = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const accountPattern = /(?:a\/c|acct|account)\s*[x*]*([0-9]{2,6})/i;
const refPattern = /(?:ref(?:erence)?(?:\s*id)?|utr|txn(?:\s*id)?)\s*[:\-]?\s*([a-z0-9\-]+)/i;

function normalizeAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

export function parseSmsForBill(sms: { address: string; body: string; date: number }): ParsedSmsBill | null {
  const body = sms.body.toLowerCase();

  // Check for bill keywords
  const billKeywords = ["due", "outstanding", "reminder", "overdue"];
  const isBill = billKeywords.some(kw => body.includes(kw));
  if (!isBill) return null;

  // Extract amount
  const amountMatch = sms.body.match(amountPattern);
  if (!amountMatch) return null;
  const amount = normalizeAmount(amountMatch[1]);

  // Extract due date
  let dueDate = new Date(sms.date).toISOString();

  // Define possible date formats
  const dateStrPattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}/i;

  // Patterns to look for in the message
  const patterns = [
    new RegExp(`(?:due|by|on)\\s*[:\\s]*(${dateStrPattern.source})`, "i"),
    new RegExp(`(${dateStrPattern.source})`, "i")
  ];

  for (const pattern of patterns) {
    const match = sms.body.match(pattern);
    if (match && match[1]) {
      const rawDate = match[1].trim();
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        // Handle 2-digit years
        if (parsedDate.getFullYear() < 100) {
          parsedDate.setFullYear(2000 + parsedDate.getFullYear());
        }
        dueDate = parsedDate.toISOString();
        break; // Found a valid date
      }
    }
  }

  return {
    sender: sms.address,
    body: sms.body,
    receivedAt: new Date(sms.date).toISOString(),
    amount,
    dueDate,
    merchant: cleanMerchant(sms.address)
  };
}

function detectType(body: string): ParsedTransactionType | null {
  const lower = body.toLowerCase();

  // Exclude non-transactional messages
  if (excludeKeywords.some(keyword => lower.includes(keyword))) return null;

  if (/(debited|spent|paid|purchase|withdrawn|withdrawal|minus|taken out|sent)/.test(lower)) return "expense";
  if (/(credited|received|deposited|refund|plus|added to)/.test(lower)) return "income";
  if (/(transfer|neft|imps|rtgs)/.test(lower)) return "expense";
  return null;
}

function detectKind(body: string): TransactionKind {
  const lower = body.toLowerCase();
  if (/(refund|reversed|chargeback)/.test(lower)) return "refund";
  if (/(transfer|self transfer|neft|imps|rtgs)/.test(lower)) return "transfer";
  if (/(credited|received|deposited)/.test(lower)) return "income";
  return "expense";
}

function cleanMerchant(name: string): string {
  if (!name) return "";

  // Words that commonly appear in SMS but aren't part of the merchant name
  const noiseWords = [
    "using", "via", "on", "at", "to", "from", "for", "ref", "id", "date",
    "bank", "ac", "acct", "available", "bal", "balance", "txn", "vpa", "upi"
  ];

  let cleaned = name
    .replace(/(?:vpa|upi|info|id|ref|txn|a\/c|acct|acc|date).*$/i, "")
    .replace(/[*\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove trailing/leading noise words
  const words = cleaned.split(" ");
  if (words.length > 0) {
    const firstWord = words[0].toLowerCase();
    const lastWord = words[words.length - 1].toLowerCase();

    if (noiseWords.includes(firstWord) && words.length > 1) words.shift();
    if (noiseWords.includes(lastWord) && words.length > 1) words.pop();

    cleaned = words.join(" ");
  }

  // Final cleanup: remove any standalone numbers or short codes if they look like trash
  if (/^[0-9 ]+$/.test(cleaned) && cleaned.length < 4) return "";

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function buildHash(sender: string, body: string, date: number): string {
  const key = `${sender}|${date}|${body}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  return `msg_${Math.abs(hash)}`;
}

export function parseSmsForTransaction(message: SmsMessage): ParsedSmsTransaction | null {
  const sender = message.address?.trim();
  const body = message.body?.trim();
  if (!sender || !body) return null;

  const lower = body.toLowerCase();
  const hasKeyword = transactionKeywords.some((keyword) => lower.includes(keyword));
  if (!hasKeyword) return null;

  const amountMatch = body.match(amountPattern);
  const type = detectType(body);
  if (!amountMatch || !type) return null;

  const amount = normalizeAmount(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const accountMatch = body.match(accountPattern);
  const refMatch = body.match(refPattern);

  // Improved merchant extraction
  let merchant: string | undefined;

  // Pattern 1: {To/At/From} {Merchant} {On/For/Using/Ref}
  const toAtMatches = body.match(/(?:to|at|from|towards)\s+([A-Za-z0-9 .&-]{2,50}?)(\s+(?:on|for|using|via|ref|id|balance|bal|date|is|at|towards)|$)/i);

  // Pattern 2: Dedicated info/memo field
  const useAtMatches = body.match(/(?:info|memo|vpa)[:*]?\s*([A-Za-z0-9 .&-]{2,40})/i);

  // Pattern 3: Capitalized merchant name after amount (common in some banks)
  // e.g. "Spent Rs.500 at ZOMATO"
  const capsMatches = body.match(/([A-Z]{3,20}(?:\s+[A-Z]{2,20})*)/);

  merchant = toAtMatches?.[1] || useAtMatches?.[1];

  // If we found a merchant, try to see if it's too generic and we can find a better one
  if (!merchant || merchant.length < 3) {
    merchant = merchant || capsMatches?.[0];
  }

  if (merchant) {
    merchant = cleanMerchant(merchant);
  }

  // If merchant is still just noise or empty, use sender as fallback but with lower confidence
  const finalMerchant = (merchant && merchant.length > 2) ? merchant : undefined;

  return {
    sender,
    body,
    receivedAt: new Date(message.date).toISOString(),
    hash: buildHash(sender, body, message.date),
    amount,
    type,
    kind: detectKind(body),
    merchant: finalMerchant,
    referenceId: refMatch?.[1]?.trim(),
    accountRef: accountMatch?.[1]?.trim(),
    confidence: finalMerchant ? 0.9 : 0.6,
  };
}

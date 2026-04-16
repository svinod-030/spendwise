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
];

const excludeKeywords = [
  "due",
  "outstanding",
  "reminder",
  "generated",
  "statement",
  "overdue",
  "will be debited",
  "request",
  "requested",
];

const amountPattern = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const accountPattern = /(?:a\/c|acct|account)\s*[x*]*([0-9]{2,6})/i;
const refPattern = /(?:ref(?:erence)?(?:\s*id)?|utr|txn(?:\s*id)?)\s*[:\-]?\s*([a-z0-9\-]+)/i;

function normalizeAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function detectType(body: string): ParsedTransactionType | null {
  const lower = body.toLowerCase();
  
  // Exclude non-transactional messages
  if (excludeKeywords.some(keyword => lower.includes(keyword))) return null;
  
  if (/(debited|spent|paid|purchase|withdrawn|minus|taken out)/.test(lower)) return "expense";
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
  return name
    .replace(/(?:vpa|upi|info|id|ref|txn).*$/i, "")
    .replace(/[*\-]/g, " ")
    .trim();
}

function buildHash(sender: string, body: string, date: number): string {
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
  
  // Try extracting merchant with multiple patterns
  let merchant: string | undefined;
  const toAtMatches = body.match(/(?:to|at|from)\s+([A-Za-z0-9 .&-]{2,50})/i);
  const usedAtMatches = body.match(/info[:*]\s*([A-Za-z0-9 .&-]{2,40})/i);
  const upiMatches = body.match(/(?:VPA|UPI)[:*]\s*([A-Za-z0-9 .&-]{2,30})/i);
  
  merchant = toAtMatches?.[1] || usedAtMatches?.[1] || upiMatches?.[1];
  if (merchant) {
    merchant = cleanMerchant(merchant);
  }

  return {
    sender,
    body,
    receivedAt: new Date(message.date).toISOString(),
    hash: buildHash(sender, body, message.date),
    amount,
    type,
    kind: detectKind(body),
    merchant: merchant || undefined,
    referenceId: refMatch?.[1]?.trim(),
    accountRef: accountMatch?.[1]?.trim(),
    confidence: merchant ? 0.9 : 0.75,
  };
}

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

export interface ParserConfig {
  transactionKeywords: string[];
  excludeKeywords: string[];
  merchantNoiseWords: string[];
  directMerchants: string[];
  allCapsNoiseWords: string[];
  billKeywords: string[];
}

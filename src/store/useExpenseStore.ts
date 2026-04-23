import { create } from "zustand";
import { getDb } from "../db/database";
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { parseSmsForTransaction, TransactionKind, parseSmsForBill, buildHash } from "../utils/smsParser";
import { checkSmsPermission, readInboxMessages, requestSmsPermission } from "../utils/smsReader";

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: number;
  category_id: number | null;
  amount: number;
  type: "expense" | "income";
  kind?: TransactionKind;
  date: string;
  note: string;
  source_message_id?: number;
  merchant?: string;
  currency?: string;
  account_ref?: string;
  reference_id?: string;
  raw_sender?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  is_excluded?: number;
  parent_id?: number | null;
}

export interface Budget {
  id: number;
  category_id: number | null;
  period_type: "monthly" | "weekly";
  limit_amount: number;
  start_date: string;
}

export interface CategorySpending {
  category_id: number | null;
  category_name: string;
  category_color?: string;
  total: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
}

export interface MerchantSpending {
  merchant: string;
  total: number;
}

export interface Bill {
  id: number;
  sender: string;
  body: string;
  amount: number;
  due_date: string;
  status: "unpaid" | "paid";
  category_id?: number | null;
  transaction_id?: number | null;
}

interface ExpenseState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  bills: Bill[];
  currency: string;
  isLoading: boolean;
  isSyncing: boolean;
  fetchCategories: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchCurrency: () => Promise<string>;
  updateCurrency: (currency: string) => Promise<void>;
  isSetupDone: () => Promise<boolean>;
  setSetupDone: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  addCategory: (category: Omit<Category, "id">) => Promise<void>;
  fetchBudgets: () => Promise<void>;
  upsertMonthlyBudget: (limitAmount: number) => Promise<void>;
  getCurrentMonthExpenseTotal: (month?: string) => Promise<number>;
  getCurrentMonthIncomeTotal: (month?: string) => Promise<number>;
  getCurrentMonthCategorySpending: (month?: string) => Promise<CategorySpending[]>;
  getMonthlyTrends: () => Promise<MonthlyTrend[]>;
  getMerchantSpending: () => Promise<MerchantSpending[]>;
  fetchBills: (month?: string) => Promise<void>;
  markBillAsPaid: (billId: number, transactionId?: number) => Promise<void>;
  deleteBill: (billId: number) => Promise<void>;
  cleanupDuplicateBills: () => Promise<void>;
  importTransactionsFromSms: (limit?: number) => Promise<{ imported: number; skipped: number }>;
  syncRecentSmsTransactions: () => Promise<{ imported: number; skipped: number }>;
  processIncomingSmsMessage: (message: { address: string; body: string; date: number }) => Promise<boolean>;
  runInitialSmsImportIfNeeded: () => Promise<{ ran: boolean; imported: number; skipped: number }>;
  exportData: () => Promise<void>;
  generateExportTxt: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  getCurrencySymbol: (code?: string) => string;
  fetchMessageById: (id: number) => Promise<{ sender: string; body: string; date: string } | null>;
}

import { CURRENCY_SYMBOLS } from "../constants/currencies";

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  transactions: [],
  categories: [],
  budgets: [],
  bills: [],
  currency: "INR",
  isLoading: false,
  isSyncing: false,

  getCurrencySymbol: (code?: string) => {
    const target = code || get().currency;

    if (CURRENCY_SYMBOLS[target]) return CURRENCY_SYMBOLS[target];

    try {
      const symbol = (0).toLocaleString("en-US", {
        style: 'currency',
        currency: target,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).replace(/\d/g, '').replace(/[.,]/g, '').trim();
      return symbol || target;
    } catch {
      return target;
    }
  },

  fetchCategories: async () => {
    const db = await getDb();
    const categories = await db.getAllAsync<Category>("SELECT * FROM categories");
    set({ categories });
  },

  fetchTransactions: async () => {
    set({ isLoading: true });
    const db = await getDb();
    const transactions = await db.getAllAsync<Transaction>(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC
    `);
    set({ transactions, isLoading: false });
  },

  addTransaction: async (transaction) => {
    const db = await getDb();
    const kind = transaction.kind ?? (transaction.type === "income" ? "income" : "expense");
    await db.runAsync(
      "INSERT INTO transactions (category_id, amount, type, kind, date, note, is_excluded) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [transaction.category_id, transaction.amount, transaction.type, kind, transaction.date, transaction.note, transaction.is_excluded || 0]
    );
    await get().fetchTransactions();
  },

  updateTransaction: async (id, transaction) => {
    const db = await getDb();
    const sets: string[] = [];
    const params: any[] = [];

    if (transaction.category_id !== undefined) { sets.push("category_id = ?"); params.push(transaction.category_id); }
    if (transaction.amount !== undefined) { sets.push("amount = ?"); params.push(transaction.amount); }
    if (transaction.type !== undefined) { sets.push("type = ?"); params.push(transaction.type); }
    if (transaction.kind !== undefined) { sets.push("kind = ?"); params.push(transaction.kind); }
    if (transaction.date !== undefined) { sets.push("date = ?"); params.push(transaction.date); }
    if (transaction.note !== undefined) { sets.push("note = ?"); params.push(transaction.note); }
    if (transaction.is_excluded !== undefined) { sets.push("is_excluded = ?"); params.push(transaction.is_excluded); }
    if (transaction.parent_id !== undefined) { sets.push("parent_id = ?"); params.push(transaction.parent_id); }

    if (sets.length === 0) return;

    params.push(id);
    await db.runAsync(
      `UPDATE transactions SET ${sets.join(", ")} WHERE id = ?`,
      params
    );
    await get().fetchTransactions();
  },

  deleteTransaction: async (id) => {
    const db = await getDb();
    await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
    await get().fetchTransactions();
  },

  fetchCurrency: async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'currency'");
    const currency = row?.value || "INR";
    set({ currency });
    return currency;
  },

  fetchMessageById: async (id: number) => {
    const db = await getDb();
    return await db.getFirstAsync<{ sender: string; body: string; date: string }>(
      "SELECT sender, body, received_at as date FROM messages WHERE id = ?",
      [id]
    );
  },

  updateCurrency: async (currency: string) => {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('currency', ?)", [currency]);
    set({ currency });
  },

  isSetupDone: async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'setup_done'");
    return row?.value === "true";
  },

  setSetupDone: async () => {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('setup_done', 'true')");
  },

  addCategory: async (category) => {
    const db = await getDb();
    await db.runAsync("INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)", [
      category.name,
      category.icon,
      category.color,
    ]);
    await get().fetchCategories();
  },

  fetchBudgets: async () => {
    const db = await getDb();
    const budgets = await db.getAllAsync<Budget>(
      "SELECT * FROM budgets ORDER BY category_id ASC, id ASC"
    );
    set({ budgets });
  },

  upsertMonthlyBudget: async (limitAmount) => {
    const db = await getDb();
    // Manual UPSERT because SQLite UNIQUE(category_id) where category_id IS NULL 
    // does NOT trigger a conflict on multiple NULLs.
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM budgets WHERE category_id IS NULL AND period_type = 'monthly'"
    );

    if (existing) {
      await db.runAsync(
        "UPDATE budgets SET limit_amount = ?, start_date = ? WHERE id = ?",
        [limitAmount, new Date().toISOString(), existing.id]
      );
    } else {
      await db.runAsync(
        "INSERT INTO budgets (category_id, period_type, limit_amount, start_date) VALUES (NULL, 'monthly', ?, ?)",
        [limitAmount, new Date().toISOString()]
      );
    }
    await get().fetchBudgets();
  },

  getCurrentMonthExpenseTotal: async (month?: string) => {
    const db = await getDb();
    const dateQuery = month ? `date('${month}-01')` : "date('now', 'start of month')";

    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT (
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE kind = 'expense' AND is_excluded = 0 
         AND date >= ${dateQuery} AND date < date(${dateQuery}, '+1 month'))
        -
        (SELECT COALESCE(SUM(r.amount), 0) 
         FROM transactions r 
         JOIN transactions p ON r.parent_id = p.id 
         WHERE r.is_excluded = 0 
         AND p.date >= ${dateQuery} AND p.date < date(${dateQuery}, '+1 month'))
      ) as total`
    );

    return row?.total ?? 0;
  },

  getCurrentMonthIncomeTotal: async (month?: string) => {
    const db = await getDb();
    const dateQuery = month ? `date('${month}-01')` : "date('now', 'start of month')";
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE type = 'income'
       AND parent_id IS NULL
       AND is_excluded = 0
       AND date >= ${dateQuery}
       AND date < date(${dateQuery}, '+1 month')`
    );
    return row?.total ?? 0;
  },

  getCurrentMonthCategorySpending: async (month?: string) => {
    const db = await getDb();
    const dateQuery = month ? `date('${month}-01')` : "date('now', 'start of month')";

    const rows = await db.getAllAsync<CategorySpending>(
      `SELECT 
        c.id as category_id, 
        COALESCE(c.name, 'Uncategorized') as category_name, 
        c.color as category_color,
        (
          (SELECT COALESCE(SUM(t2.amount), 0) 
           FROM transactions t2 
           WHERE t2.kind = 'expense' AND t2.category_id = c.id AND t2.is_excluded = 0
           AND t2.date >= ${dateQuery} AND t2.date < date(${dateQuery}, '+1 month'))
          -
          (SELECT COALESCE(SUM(r.amount), 0)
           FROM transactions r
           JOIN transactions p ON r.parent_id = p.id
           WHERE p.category_id = c.id AND r.is_excluded = 0
           AND p.date >= ${dateQuery} AND p.date < date(${dateQuery}, '+1 month'))
        ) as total
       FROM categories c
       GROUP BY c.id, c.name, c.color
       HAVING total > 0
       ORDER BY total DESC`
    );
    return rows;
  },

  getMonthlyTrends: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<MonthlyTrend>(
      `SELECT strftime('%Y-%m', date) as month, 
              (
                (SELECT COALESCE(SUM(t2.amount), 0) 
                 FROM transactions t2 
                 WHERE t2.kind = 'expense' AND t2.is_excluded = 0 
                 AND strftime('%Y-%m', t2.date) = strftime('%Y-%m', t1.date))
                -
                (SELECT COALESCE(SUM(r.amount), 0)
                 FROM transactions r
                 JOIN transactions p ON r.parent_id = p.id
                 WHERE r.is_excluded = 0
                 AND strftime('%Y-%m', p.date) = strftime('%Y-%m', t1.date))
              ) as total
       FROM transactions t1
       WHERE t1.kind = 'expense' AND t1.is_excluded = 0
       GROUP BY month
       ORDER BY month ASC`
    );
    return rows;
  },

  getMerchantSpending: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<MerchantSpending>(
      `SELECT 
        merchant,
        (
          (SELECT COALESCE(SUM(t2.amount), 0) 
           FROM transactions t2 
           WHERE t2.kind = 'expense' AND t2.merchant = t1.merchant AND t2.is_excluded = 0)
          -
          (SELECT COALESCE(SUM(r.amount), 0)
           FROM transactions r
           JOIN transactions p ON r.parent_id = p.id
           WHERE p.merchant = t1.merchant AND r.is_excluded = 0)
        ) as total
       FROM transactions t1
       WHERE t1.kind = 'expense' AND t1.merchant IS NOT NULL
       GROUP BY merchant
       ORDER BY total DESC`
    );
    return rows;
  },
  importTransactionsFromSms: async (limit?: number) => {
    set({ isSyncing: true });
    try {
      const hasPermission = await requestSmsPermission();
      if (!hasPermission) {
        throw new Error("SMS permission denied");
      }

      const db = await getDb();
      const messages = await readInboxMessages();
      const { imported, skipped } = await ingestSmsMessages(db, messages);

      await get().fetchTransactions();
      await get().fetchBills();
      return { imported, skipped };
    } finally {
      set({ isSyncing: false });
    }
  },

  syncRecentSmsTransactions: async () => {
    set({ isSyncing: true });
    try {
      const hasPermission = await checkSmsPermission();
      if (!hasPermission) return { imported: 0, skipped: 0 };

      const db = await getDb();
      const messages = await readInboxMessages(100);
      const result = await ingestSmsMessages(db, messages);
      // Always refresh to catch changes made by the Headless task
      await get().fetchTransactions();
      await get().fetchBills();
      return result;
    } finally {
      set({ isSyncing: false });
    }
  },

  processIncomingSmsMessage: async (message) => {
    set({ isSyncing: true });
    try {
      const db = await getDb();
      const result = await ingestSmsMessages(db, [message]);
      if (result.imported > 0) {
        await get().fetchTransactions();
        await get().fetchBills();
        return true;
      }
      return false;
    } finally {
      set({ isSyncing: false });
    }
  },

  runInitialSmsImportIfNeeded: async () => {
    const db = await getDb();
    const importMetaKey = "sms_initial_import_done";
    const existing = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
      [importMetaKey]
    );

    if (existing?.value === "true") {
      return { ran: false, imported: 0, skipped: 0 };
    }

    try {
      const result = await get().importTransactionsFromSms();   // No limit since it's a one time import on app launch
      await db.runAsync(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
        [importMetaKey, "true"]
      );
      return { ran: true, imported: result.imported, skipped: result.skipped };
    } catch {
      return { ran: false, imported: 0, skipped: 0 };
    }
  },

  exportData: async () => {
    const db = await getDb();
    const transactions = await db.getAllAsync("SELECT * FROM transactions");
    const categories = await db.getAllAsync("SELECT * FROM categories");
    const data = JSON.stringify({ transactions, categories }, null, 2);

    const dir = FileSystem.Directory.pickDirectoryAsync();
    if (!dir) throw new Error("No storage directory available");

    const fileUri = dir + "expense_backup.json";
    const file = new File(fileUri);
    file.write(data);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
  },

  generateExportTxt: async () => {
    const db = await getDb();
    const transactions = await db.getAllAsync<any>("SELECT * FROM transactions ORDER BY date DESC");
    const bills = await db.getAllAsync<any>("SELECT * FROM bills ORDER BY due_date DESC");
    const categories = await db.getAllAsync<any>("SELECT * FROM categories");
    const messages = await db.getAllAsync<any>("SELECT * FROM messages ORDER BY received_at DESC");

    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {} as Record<number, string>);

    let content = "SPENDWISE DATA EXPORT\n";
    content += `Exported on: ${new Date().toLocaleString()}\n`;
    content += "=====================\n\n";

    content += "TRANSACTIONS\n";
    content += "------------\n";
    if (transactions.length === 0) {
      content += "No transactions found.\n";
    } else {
      transactions.forEach((t: any) => {
        const catName = t.category_id ? categoryMap[t.category_id] || "Unknown" : "Uncategorized";
        const msgIdStr = t.source_message_id ? ` [MsgID: ${t.source_message_id}]` : "";
        content += `ID: ${t.id}${msgIdStr} | Date: ${t.date} | Amount: ${t.amount} | Type: ${t.type} | Kind: ${t.kind} | Cat: ${catName} | Merchant: ${t.merchant || "N/A"} | Note: ${t.note || ""}\n`;
      });
    }

    content += "\nBILLS\n";
    content += "-----\n";
    if (bills.length === 0) {
      content += "No bills found.\n";
    } else {
      bills.forEach((b: any) => {
        const catName = b.category_id ? categoryMap[b.category_id] || "Unknown" : "Uncategorized";
        content += `ID: ${b.id} | Due: ${b.due_date} | Amount: ${b.amount} | Status: ${b.status} | Sender: ${b.sender || "N/A"} | Cat: ${catName}\n`;
      });
    }

    content += "\nRAW MESSAGES\n";
    content += "------------\n";
    if (messages.length === 0) {
      content += "No raw messages found.\n";
    } else {
      messages.forEach((m: any) => {
        content += `ID: ${m.id} | From: ${m.sender} | Date: ${m.received_at} | Conf: ${m.parse_confidence}\n`;
        content += `Body: ${m.body}\n`;
        content += "-------------------\n";
      });
    }

    return content;
  },

  importData: async (jsonData) => {
    const db = await getDb();
    const { transactions, categories } = JSON.parse(jsonData);

    // Clear existing data
    await db.execAsync("DELETE FROM transactions; DELETE FROM categories;");

    // Insert categories
    for (const cat of categories) {
      await db.runAsync(
        "INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)",
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }

    // Insert transactions
    for (const t of transactions) {
      const kind = t.kind ?? (t.type === "income" ? "income" : "expense");
      await db.runAsync(
        "INSERT INTO transactions (category_id, amount, type, kind, date, note) VALUES (?, ?, ?, ?, ?, ?)",
        [t.category_id, t.amount, t.type, kind, t.date, t.note]
      );
    }

    await get().fetchCategories();
    await get().fetchTransactions();
  },

  clearAllData: async () => {
    const db = await getDb();
    await db.execAsync("DELETE FROM transactions; DELETE FROM messages; DELETE FROM budgets; DELETE from bills;");
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('sms_initial_import_done', 'false')");
    await get().fetchTransactions();
    await get().fetchBudgets();
    await get().fetchBills();
  },

  fetchBills: async (month?: string) => {
    const db = await getDb();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = month || currentMonth;
    const dateQuery = `date('${targetMonth}-01')`;

    // Auto-cleanup duplicates if any exist from previous bug
    await db.runAsync(`
      DELETE FROM bills 
      WHERE status = 'unpaid' AND id NOT IN (
        SELECT MIN(id) FROM bills GROUP BY body, amount, due_date
      )
    `);

    // Boundary logic:
    // If current month is selected: show this month + next month.
    // Otherwise: show only the respective month.
    const isCurrent = targetMonth === currentMonth;
    const endBoundary = isCurrent ? `date(${dateQuery}, '+2 months')` : `date(${dateQuery}, '+1 month')`;

    const bills = await db.getAllAsync<Bill>(
      `SELECT * FROM bills 
       WHERE due_date >= ${dateQuery} 
       AND due_date < ${endBoundary}
       AND NOT (amount = 0 AND due_date >= date('now', 'start of month', '+2 months'))
       ORDER BY due_date ASC`
    );
    set({ bills });
  },

  cleanupDuplicateBills: async () => {
    const db = await getDb();
    await db.runAsync(`
      DELETE FROM bills 
      WHERE status = 'unpaid' AND id NOT IN (
        SELECT MIN(id) FROM bills GROUP BY body, amount, due_date
      )
    `);
    get().fetchBills();
  },

  markBillAsPaid: async (billId, transactionId) => {
    const db = await getDb();
    const bill = await db.getFirstAsync<Bill>("SELECT * FROM bills WHERE id = ?", [billId]);
    if (!bill) return;

    // 1. Mark as paid & link transaction_id
    if (transactionId) {
      await db.runAsync("UPDATE bills SET status = 'paid', transaction_id = ? WHERE id = ?", [transactionId, billId]);
    } else {
      // Create new transaction if none provided (manual payment)
      const txId = Date.now(); // In reality addTransaction should return the ID
      // Let's call addTransaction but we need the ID back. 
      // addTransaction in useExpenseStore is async and doesn't return ID.
      // I'll manually insert to get the ID for linking.
      const categoryId = bill.category_id || null;
      const result = await db.runAsync(
        `INSERT INTO transactions 
          (category_id, amount, type, kind, date, note, merchant) 
          VALUES (?, ?, 'expense', 'expense', ?, ?, ?)`,
        [
          categoryId,
          bill.amount,
          new Date().toISOString(),
          bill.body ? bill.body.substring(0, 100) : "Paid Bill",
          bill.sender ? cleanMerchant(bill.sender) : "Bill Payment"
        ]
      );
      const lastId = result.lastInsertRowId;
      await db.runAsync("UPDATE bills SET status = 'paid', transaction_id = ? WHERE id = ?", [lastId, billId]);
      await get().fetchTransactions();
    }

    await get().fetchBills();
  },

  deleteBill: async (billId: number) => {
    const db = await getDb();
    await db.runAsync("DELETE FROM bills WHERE id = ?", [billId]);
    await get().fetchBills();
  },
}));

// Helper to clean merchant names (moved from smsParser or just using it)
function cleanMerchant(name: string) {
  return name.replace(/^VM-|^AD-|^DM-|^HP-|^BZ-|^CP-|^IC-|^AX-|^HD-|^SC-/, "").trim();
}

async function ingestSmsMessages(
  db: Awaited<ReturnType<typeof getDb>>,
  messages: Awaited<ReturnType<typeof readInboxMessages>>
) {
  let imported = 0;
  let skipped = 0;

  for (const message of messages) {
    const parsed = await parseSmsForTransaction(message);
    if (!parsed) {
      // Try parsing as a bill if it's not a transaction
      const parsedBill = await parseSmsForBill(message);
      if (parsedBill && parsedBill.amount > 0) {
        const hash = buildHash(parsedBill.sender, parsedBill.body, message.date);
        const existingMessage = await db.getFirstAsync<{ id: number }>("SELECT id FROM messages WHERE hash = ?", [hash]);

        if (!existingMessage) {
          // Use atomic inserts with OR IGNORE
          const billMsgResult = await db.runAsync(
            "INSERT OR IGNORE INTO messages (sender, body, received_at, hash, parse_confidence, processed_status) VALUES (?, ?, ?, ?, 1.0, 'processed')",
            [parsedBill.sender, parsedBill.body, parsedBill.receivedAt, hash]
          );

          if (billMsgResult.changes > 0) {
            await db.runAsync(
              "INSERT INTO bills (sender, body, amount, due_date, status) VALUES (?, ?, ?, ?, 'unpaid')",
              [parsedBill.sender, parsedBill.body, parsedBill.amount, parsedBill.dueDate || new Date().toISOString()]
            );
            imported += 1;
          }
        }
      }
      skipped += 1;
      continue;
    }

    // 1. Check if message already processed (Fast check)
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM messages WHERE hash = ?",
      [parsed.hash]
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    // 2. Advanced duplicate check (same reference ID)
    if (parsed.referenceId) {
      const existingRef = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM transactions WHERE reference_id = ?",
        [parsed.referenceId]
      );
      if (existingRef) {
        skipped += 1;
        continue;
      }
    }

    // 3. Atomically insert message and get its ID
    const messageInsert = await db.runAsync(
      `INSERT OR IGNORE INTO messages (sender, body, received_at, hash, parse_confidence, processed_status)
       VALUES (?, ?, ?, ?, ?, 'processed')`,
      [parsed.sender, parsed.body, parsed.receivedAt, parsed.hash, parsed.confidence]
    );

    // If no message was inserted, it was a duplicate race condition
    if (messageInsert.changes === 0) {
      skipped += 1;
      continue;
    }

    // 4. Insert the transaction
    const categoryId = await getCategoryIdForMessage(db, parsed.body, parsed.merchant, parsed.type);
    const txResult = await db.runAsync(
      `INSERT INTO transactions
        (category_id, amount, type, kind, date, note, source_message_id, merchant, currency, account_ref, reference_id, raw_sender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryId,
        parsed.amount,
        parsed.type,
        parsed.kind,
        parsed.receivedAt,
        parsed.merchant || (parsed.sender ? `SMS: ${parsed.sender}` : "Miscellaneous"),
        messageInsert.lastInsertRowId,
        parsed.merchant || null,
        "INR",
        parsed.accountRef || null,
        parsed.referenceId || null,
        parsed.sender,
      ]
    );

    if (parsed.kind === 'refund') {
      await tryAutoLinkRefund(db, txResult.lastInsertRowId, parsed.amount, parsed.merchant, parsed.receivedAt);
    }
    imported += 1;
  }

  return { imported, skipped };
}

async function tryAutoLinkRefund(
  db: Awaited<ReturnType<typeof getDb>>,
  refundId: number,
  amount: number,
  merchant: string | null | undefined,
  date: string
) {
  if (!merchant || amount <= 0) return;

  // Search for an expense with same merchant in last 30 days
  const potentialParent = await db.getFirstAsync<{ id: number; category_id: number }>(
    `SELECT id, category_id FROM transactions 
     WHERE kind = 'expense' 
     AND LOWER(merchant) = LOWER(?) 
     AND amount >= ?
     AND date <= ?
     AND date >= date(?, '-30 days')
     ORDER BY date DESC LIMIT 1`,
    [merchant, amount, date, date]
  );

  if (potentialParent) {
    await db.runAsync(
      "UPDATE transactions SET parent_id = ?, category_id = COALESCE(category_id, ?) WHERE id = ?",
      [potentialParent.id, potentialParent.category_id, refundId]
    );
  }
}

async function getCategoryIdForMessage(
  db: Awaited<ReturnType<typeof getDb>>,
  body: string,
  merchant: string | undefined,
  type: "expense" | "income"
) {
  const normalized = body.toLowerCase();
  const merchantText = (merchant || "").toLowerCase();
  const combined = `${normalized} ${merchantText}`;

  if (type === "income") {
    const salary = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categories WHERE LOWER(name) = 'salary' LIMIT 1"
    );
    return salary?.id ?? null;
  }

  // Comprehensive category keywords matching getCategoryIcon
  const categoryKeywords: Record<string, string[]> = {
    Food: [
      "swiggy", "zomato", "restaurant", "food", "cafe", "coffee",
      "pizza", "burger", "dominos", "starbucks", "eat", "meal",
      "lunch", "dinner", "dining", "uber eats"
    ],
    Groceries: [
      "blinkit", "bigbasket", "zepto", "grocery", "groceries",
      "supermarket", "dmart", "reliance fresh", "spencer", "mart",
      "kirana", "vegetable", "fruit", "dairy", "milk"
    ],
    Transport: [
      "uber", "ola", "rapido", "metro", "train", "bus", "auto",
      "taxi", "cab", "irctc", "travel", "booking"
    ],
    Travel: [
      "flight", "airline", "hotel", "stay", "makemytrip", "goibibo",
      "airbnb", "oyo", "trivago"
    ],
    Bills: [
      "electricity", "broadband", "wifi", "recharge", "bill",
      "water", "gas", "mobile", "dth", "utility", "power", "energy",
      "bsnl", "airtel", "jio", "vi", "vodafone", "idea",
      "tata power", "bescom", "mseb", "maintenance"
    ],
    Rent: ["rent", "housing", "apartment", "flat", "pg", "hostel"],
    Shopping: [
      "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa",
      "purplle", "tatacliq", "snapdeal", "mall", "shopping",
      "fashion", "clothing", "electronics", "gadget"
    ],
    Health: [
      "pharmacy", "hospital", "health", "medic", "doctor", "clinic",
      "apollo", "pharmeasy", "1mg", "netmeds", "diagnostic",
      "lab", "test", "fitness", "gym", "wellness"
    ],
    Entertainment: [
      "netflix", "prime", "hotstar", "disney", "sony", "zee5",
      "spotify", "youtube", "music", "movie", "cinema", "pvr",
      "inox", "bookmyshow", "game", "gaming"
    ],
    Subscriptions: ["subscription", "subscriptions", "recurring", "monthly", "annual", "ott"],
    Education: [
      "course", "tuition", "fee", "exam", "book", "udemy",
      "coursera", "byju", "unacademy", "vedantu", "upgrad",
      "learning", "study", "school", "college"
    ],
    Fuel: [
      "fuel", "petrol", "diesel", "hpcl", "bpcl", "iocl", "shell",
      "vehicle", "car", "bike", "scooter", "parking", "toll", "fastag"
    ],
    Gifts: ["gift", "present", "donation", "charity", "celebration", "festival"],
    EMI: ["emi", "loan", "mortgage"],
    Investment: [
      "invest", "mutual fund", "stock", "share", "demat", "trading",
      "zerodha", "groww", "upstox", "etmoney", "savings", "fd",
      "fixed deposit", "rd", "ppf", "nps", "insurance", "lic"
    ],
    Transfer: [
      "transfer", "sent", "received", "upi", "neft", "imps", "rtgs",
      "paytm", "phonepe", "gpay", "google pay", "bhim", "cred"
    ]
  };

  for (const [categoryName, words] of Object.entries(categoryKeywords)) {
    if (words.some((word) => combined.includes(word))) {
      const category = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
        [categoryName]
      );
      if (category?.id) return category.id;
    }
  }

  const other = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE LOWER(name) = 'other' LIMIT 1"
  );
  return other?.id ?? null;
}

export function getCategoryIcon(categoryName?: string | null, merchant?: string | null, note?: string | null): string {
  const name = (categoryName || "").toLowerCase().trim();
  const merch = (merchant || "").toLowerCase().trim();
  const noteText = (note || "").toLowerCase().trim();
  const combined = `${name} ${merch} ${noteText}`;

  if (!name && !merch) return "CircleDollarSign";

  // Food & Dining
  if (combined.includes("food") || combined.includes("dining") || combined.includes("restaurant") ||
    combined.includes("swiggy") || combined.includes("zomato") || combined.includes("uber eats") ||
    combined.includes("pizza") || combined.includes("burger") || combined.includes("cafe") ||
    combined.includes("coffee") || combined.includes("starbucks") || combined.includes("dominos") ||
    combined.includes("eat") || combined.includes("meal") || combined.includes("lunch") || combined.includes("dinner"))
    return "UtensilsCrossed";

  // Groceries
  if (combined.includes("grocery") || combined.includes("groceries") || combined.includes("supermarket") ||
    combined.includes("bigbasket") || combined.includes("blinkit") || combined.includes("zepto") ||
    combined.includes("dmart") || combined.includes("reliance fresh") || combined.includes("spencer") ||
    combined.includes("mart") || combined.includes("kirana") || combined.includes("vegetable") ||
    combined.includes("fruit") || combined.includes("dairy") || combined.includes("milk"))
    return "ShoppingCart";

  // Transport (local commuting)
  if (combined.includes("transport") || combined.includes("cab") ||
    combined.includes("uber") || combined.includes("ola") || combined.includes("rapido") ||
    combined.includes("bus") || combined.includes("metro") || combined.includes("auto") ||
    combined.includes("taxi"))
    return "Car";

  // Travel (long distance trips)
  if (combined.includes("travel") || combined.includes("train") || combined.includes("flight") ||
    combined.includes("irctc") || combined.includes("makemytrip") || combined.includes("goibibo") ||
    combined.includes("booking") || combined.includes("hotel") || combined.includes("stay") ||
    combined.includes("airbnb") || combined.includes("oyo") || combined.includes("trivago"))
    return "Plane";

  // Fuel & Vehicle
  if (combined.includes("fuel") || combined.includes("petrol") || combined.includes("diesel") ||
    combined.includes("hpcl") || combined.includes("bpcl") || combined.includes("iocl") ||
    combined.includes("shell") || combined.includes("vehicle") || combined.includes("car") ||
    combined.includes("bike") || combined.includes("scooter") || combined.includes("parking") ||
    combined.includes("toll") || combined.includes("fastag"))
    return "Fuel";

  // Bills & Utilities
  if (combined.includes("bill") || combined.includes("recharge") || combined.includes("electricity") ||
    combined.includes("water") || combined.includes("gas") || combined.includes("broadband") ||
    combined.includes("wifi") || combined.includes("mobile") || combined.includes("dth") ||
    combined.includes("utility") || combined.includes("power") || combined.includes("energy") ||
    combined.includes("bsnl") || combined.includes("airtel") || combined.includes("jio") ||
    combined.includes("vi ") || combined.includes("vodafone") || combined.includes("idea") ||
    combined.includes("tata power") || combined.includes("bescom") || combined.includes("mseb") ||
    combined.includes("rent") || combined.includes("maintenance"))
    return "Receipt";

  // Shopping
  if (combined.includes("shopping") || combined.includes("amazon") || combined.includes("flipkart") ||
    combined.includes("myntra") || combined.includes("ajio") || combined.includes("meesho") ||
    combined.includes("nykaa") || combined.includes("purplle") || combined.includes("tatacliq") ||
    combined.includes("snapdeal") || combined.includes("shopify") || combined.includes("store") ||
    combined.includes("mall") || combined.includes("retail") || combined.includes("fashion") ||
    combined.includes("clothing") || combined.includes("electronics") || combined.includes("gadget"))
    return "ShoppingBag";

  // Health & Medical
  if (combined.includes("health") || combined.includes("medical") || combined.includes("hospital") ||
    combined.includes("pharmacy") || combined.includes("medicine") || combined.includes("doctor") ||
    combined.includes("clinic") || combined.includes("apollo") || combined.includes("pharmeasy") ||
    combined.includes("1mg") || combined.includes("netmeds") || combined.includes("diagnostic") ||
    combined.includes("lab") || combined.includes("test") || combined.includes("fitness") ||
    combined.includes("gym") || combined.includes("wellness"))
    return "HeartPulse";

  // Entertainment
  if (combined.includes("entertainment") || combined.includes("movie") || combined.includes("cinema") ||
    combined.includes("pvr") || combined.includes("inox") || combined.includes("bookmyshow") ||
    combined.includes("netflix") || combined.includes("prime") || combined.includes("hotstar") ||
    combined.includes("disney") || combined.includes("sony") || combined.includes("zee5") ||
    combined.includes("spotify") || combined.includes("youtube") || combined.includes("music") ||
    combined.includes("game") || combined.includes("gaming") || combined.includes("play") ||
    combined.includes("ott"))
    return "Clapperboard";

  // Subscriptions (separate from entertainment)
  if (combined.includes("subscription") || combined.includes("subscriptions") || combined.includes("recurring") ||
    combined.includes("monthly") || combined.includes("annual"))
    return "CalendarCheck";

  // Education
  if (combined.includes("education") || combined.includes("school") || combined.includes("college") ||
    combined.includes("university") || combined.includes("course") || combined.includes("tuition") ||
    combined.includes("fee") || combined.includes("exam") || combined.includes("book") ||
    combined.includes("udemy") || combined.includes("coursera") || combined.includes("byju") ||
    combined.includes("unacademy") || combined.includes("vedantu") || combined.includes("upgrad") ||
    combined.includes("learning") || combined.includes("study"))
    return "GraduationCap";

  // Rent & Housing
  if (combined.includes("rent") || combined.includes("housing") || combined.includes("apartment") ||
    combined.includes("flat") || combined.includes("pg") || combined.includes("hostel") ||
    combined.includes("accommodation") || combined.includes("lease"))
    return "Home";

  // Salary & Income
  if (combined.includes("salary") || combined.includes("income") || combined.includes("payroll") ||
    combined.includes("stipend") || combined.includes("wage") || combined.includes("earned") ||
    combined.includes("deposit") || combined.includes("credited") || combined.includes("received"))
    return "Banknote";

  // Investment
  if (combined.includes("invest") || combined.includes("mutual fund") || combined.includes("stock") ||
    combined.includes("share") || combined.includes("demat") || combined.includes("trading") ||
    combined.includes("zerodha") || combined.includes("groww") || combined.includes("upstox") ||
    combined.includes("etmoney") || combined.includes("savings") || combined.includes("fd") ||
    combined.includes("fixed deposit") || combined.includes("rd") || combined.includes("ppf") ||
    combined.includes("nps") || combined.includes("insurance") || combined.includes("lic"))
    return "TrendingUp";

  // Transfer
  if (combined.includes("transfer") || combined.includes("sent") || combined.includes("received") ||
    combined.includes("upi") || combined.includes("neft") || combined.includes("imps") ||
    combined.includes("rtgs") || combined.includes("paytm") || combined.includes("phonepe") ||
    combined.includes("gpay") || combined.includes("google pay") || combined.includes("bhim") ||
    combined.includes("cred") || combined.includes("mobikwik") || combined.includes("freecharge"))
    return "ArrowLeftRight";

  // Refund
  if (combined.includes("refund") || combined.includes("return") || combined.includes("reversal") ||
    combined.includes("cashback"))
    return "RotateCcw";

  // Insurance
  if (combined.includes("insurance") || combined.includes("policy") || combined.includes("premium") ||
    combined.includes("lic") || combined.includes("star health") || combined.includes("icici lombard") ||
    combined.includes("hdfc ergo") || combined.includes("bajaj allianz"))
    return "Shield";

  // Personal & Family
  if (combined.includes("gift") || combined.includes("donation") || combined.includes("charity") ||
    combined.includes("family") || combined.includes("personal") || combined.includes("wedding") ||
    combined.includes("celebration") || combined.includes("festival") || combined.includes("puja"))
    return "Gift";

  // Business & Professional
  if (combined.includes("business") || combined.includes("office") || combined.includes("professional") ||
    combined.includes("consulting") || combined.includes("freelance") || combined.includes("service") ||
    combined.includes("repair") || combined.includes("maintenance"))
    return "Briefcase";

  // Default
  return "CircleDollarSign";
}

export function getTransactionDisplay(transaction: Partial<Pick<Transaction, "kind" | "type" | "category_name" | "merchant" | "note">>) {
  const type = transaction.type || "expense";
  const kind = transaction.kind || (type === "income" ? "income" : "expense");
  const icon = getCategoryIcon(transaction.category_name, transaction.merchant, transaction.note);

  if (kind === "transfer") return { sign: "", colorClass: "text-amber-400", label: "Transfer", icon };
  if (kind === "refund") return { sign: "+", colorClass: "text-cyan-400", label: "Refund", icon };
  if (kind === "income") return { sign: "+", colorClass: "text-emerald-400", label: "Income", icon };
  return { sign: "-", colorClass: "text-rose-400", label: "Expense", icon };
}

import { create } from "zustand";
import { getDb } from "../db/database";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { parseSmsForTransaction, TransactionKind } from "../utils/smsParser";
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

interface ExpenseState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  currency: string;
  isLoading: boolean;
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
  importTransactionsFromSms: () => Promise<{ imported: number; skipped: number }>;
  syncRecentSmsTransactions: () => Promise<{ imported: number; skipped: number }>;
  processIncomingSmsMessage: (message: { address: string; body: string; date: number }) => Promise<boolean>;
  runInitialSmsImportIfNeeded: () => Promise<{ ran: boolean; imported: number; skipped: number }>;
  exportData: () => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
  getCurrencySymbol: () => string;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  transactions: [],
  categories: [],
  budgets: [],
  currency: "USD",
  isLoading: false,

  getCurrencySymbol: () => {
    const { currency } = get();
    const symbols: Record<string, string> = {
      USD: "$",
      INR: "₹",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency] || "$";
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
    const currency = row?.value || "USD";
    set({ currency });
    return currency;
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
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE kind = 'expense'
       AND is_excluded = 0
       AND date >= ${dateQuery}
       AND date < date(${dateQuery}, '+1 month')`
    );
    return row?.total ?? 0;
  },

  getCurrentMonthIncomeTotal: async (month?: string) => {
    const db = await getDb();
    const dateQuery = month ? `date('${month}-01')` : "date('now', 'start of month')";
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE (kind = 'income' OR kind = 'refund')
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
      `SELECT t.category_id, COALESCE(c.name, 'Uncategorized') as category_name, c.color as category_color, COALESCE(SUM(t.amount), 0) as total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.kind = 'expense'
       AND t.is_excluded = 0
       AND t.date >= ${dateQuery}
       AND t.date < date(${dateQuery}, '+1 month')
       GROUP BY t.category_id, c.name, c.color
       ORDER BY total DESC`
    );
    return rows;
  },

  getMonthlyTrends: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<MonthlyTrend>(
      `SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE kind = 'expense' AND is_excluded = 0
       GROUP BY month
       ORDER BY month ASC`
    );
    return rows;
  },

  getMerchantSpending: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<MerchantSpending>(
      `SELECT COALESCE(merchant, note, 'Unknown') as merchant, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE kind = 'expense'
       GROUP BY merchant
       ORDER BY total DESC`
    );
    return rows;
  },

  importTransactionsFromSms: async () => {
    const hasPermission = await requestSmsPermission();
    if (!hasPermission) {
      throw new Error("SMS permission denied");
    }

    const db = await getDb();
    const messages = await readInboxMessages();
    const { imported, skipped } = await ingestSmsMessages(db, messages);

    await get().fetchTransactions();
    return { imported, skipped };
  },

  syncRecentSmsTransactions: async () => {
    const hasPermission = await checkSmsPermission();
    if (!hasPermission) return { imported: 0, skipped: 0 };

    const db = await getDb();
    const messages = await readInboxMessages(30);
    const result = await ingestSmsMessages(db, messages);
    if (result.imported > 0) {
      await get().fetchTransactions();
    }
    return result;
  },

  processIncomingSmsMessage: async (message) => {
    const db = await getDb();
    const result = await ingestSmsMessages(db, [message]);
    if (result.imported > 0) {
      await get().fetchTransactions();
      return true;
    }
    return false;
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
      const result = await get().importTransactionsFromSms();
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

    // Casting to any to avoid library-specific type mismatches in this environment
    const FS = FileSystem as any;
    const dir = FS.documentDirectory || FS.cacheDirectory;
    if (!dir) throw new Error("No storage directory available");

    const fileUri = dir + "expense_backup.json";
    await FileSystem.writeAsStringAsync(fileUri, data);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
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
}));

async function ingestSmsMessages(
  db: Awaited<ReturnType<typeof getDb>>,
  messages: Awaited<ReturnType<typeof readInboxMessages>>
) {
  let imported = 0;
  let skipped = 0;

  for (const message of messages) {
    const parsed = parseSmsForTransaction(message);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    const existingHash = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM messages WHERE hash = ?",
      [parsed.hash]
    );

    if (existingHash) {
      skipped += 1;
      continue;
    }

    // Advanced duplicate check (same reference ID or same amount/day/account)
    if (parsed.referenceId) {
      const existingRef = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM transactions WHERE reference_id = ?",
        [parsed.referenceId]
      );
      if (existingRef) {
        skipped += 1;
        continue;
      }
    } else {
      // Check for same amount on the same day (naive similarity)
      const existingSimilar = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM transactions WHERE amount = ? AND date(date) = date(?) AND type = ?",
        [parsed.amount, parsed.receivedAt, parsed.type]
      );
      if (existingSimilar) {
        skipped += 1;
        continue;
      }
    }

    const messageInsert = await db.runAsync(
      `INSERT INTO messages (sender, body, received_at, hash, parse_confidence, processed_status)
       VALUES (?, ?, ?, ?, ?, 'processed')`,
      [parsed.sender, parsed.body, parsed.receivedAt, parsed.hash, parsed.confidence]
    );

    const categoryId = await getCategoryIdForMessage(db, parsed.body, parsed.type);
    await db.runAsync(
      `INSERT INTO transactions
        (category_id, amount, type, kind, date, note, source_message_id, merchant, currency, account_ref, reference_id, raw_sender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryId,
        parsed.amount,
        parsed.type,
        parsed.kind,
        parsed.receivedAt,
        parsed.merchant || parsed.body.slice(0, 80),
        messageInsert.lastInsertRowId,
        parsed.merchant || null,
        "INR",
        parsed.accountRef || null,
        parsed.referenceId || null,
        parsed.sender,
      ]
    );
    imported += 1;
  }

  return { imported, skipped };
}

async function getCategoryIdForMessage(
  db: Awaited<ReturnType<typeof getDb>>,
  body: string,
  type: "expense" | "income"
) {
  if (type === "income") {
    const salary = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categories WHERE LOWER(name) = 'salary' LIMIT 1"
    );
    return salary?.id ?? null;
  }

  const normalized = body.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    Food: ["swiggy", "zomato", "restaurant", "food", "cafe"],
    Transport: ["uber", "ola", "metro", "fuel", "petrol"],
    Bills: ["electricity", "broadband", "recharge", "bill", "emi"],
    Shopping: ["amazon", "flipkart", "mall", "shopping"],
    Health: ["pharmacy", "hospital", "health", "medic"],
    Entertainment: ["netflix", "movie", "spotify", "bookmyshow"],
  };

  for (const [categoryName, words] of Object.entries(categoryKeywords)) {
    if (words.some((word) => normalized.includes(word))) {
      const category = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
        [categoryName]
      );
      return category?.id ?? null;
    }
  }

  return null;
}

export function getCategoryIcon(categoryName?: string | null) {
  const name = (categoryName || "").toLowerCase().trim();
  if (!name) return "Package";

  if (name.includes("food") || name.includes("dining") || name.includes("utensils")) return "Utensils";
  if (name.includes("transport") || name.includes("car") || name.includes("fuel")) return "Car";
  if (name.includes("bill") || name.includes("recharge") || name.includes("electricity") || name.includes("zap")) return "Zap";
  if (name.includes("shopping") || name.includes("amazon")) return "ShoppingBag";
  if (name.includes("health") || name.includes("med") || name.includes("activity")) return "Activity";
  if (name.includes("entertainment") || name.includes("movie") || name.includes("play")) return "Play";
  if (name.includes("salary") || name.includes("income") || name.includes("briefcase")) return "Briefcase";
  if (name.includes("transfer") || name.includes("refresh")) return "RefreshCw";

  return "Package"; // Default
}

export function getTransactionDisplay(transaction: Partial<Pick<Transaction, "kind" | "type" | "category_name">>) {
  const type = transaction.type || "expense";
  const kind = transaction.kind || (type === "income" ? "income" : "expense");
  const icon = getCategoryIcon(transaction.category_name);

  if (kind === "transfer") return { sign: "", colorClass: "text-amber-400", label: "Transfer", icon };
  if (kind === "refund") return { sign: "+", colorClass: "text-cyan-400", label: "Refund", icon };
  if (kind === "income") return { sign: "+", colorClass: "text-emerald-400", label: "Income", icon };
  return { sign: "-", colorClass: "text-rose-400", label: "Expense", icon };
}

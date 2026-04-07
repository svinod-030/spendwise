import { create } from "zustand";
import { getDb } from "../db/database";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: number;
  category_id: number;
  amount: number;
  type: "expense" | "income";
  date: string;
  note: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

interface ExpenseState {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
  fetchCategories: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  exportData: () => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  transactions: [],
  categories: [],
  isLoading: false,

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
    await db.runAsync(
      "INSERT INTO transactions (category_id, amount, type, date, note) VALUES (?, ?, ?, ?, ?)",
      [transaction.category_id, transaction.amount, transaction.type, transaction.date, transaction.note]
    );
    await get().fetchTransactions();
  },

  deleteTransaction: async (id) => {
    const db = await getDb();
    await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
    await get().fetchTransactions();
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
      await db.runAsync(
        "INSERT INTO transactions (category_id, amount, type, date, note) VALUES (?, ?, ?, ?, ?)",
        [t.category_id, t.amount, t.type, t.date, t.note]
      );
    }
    
    await get().fetchCategories();
    await get().fetchTransactions();
  },
}));

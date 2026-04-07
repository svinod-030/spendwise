import * as SQLite from "expo-sqlite";

const DB_NAME = "expenses.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('expense', 'income')) NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );
  `);

  // Seed default categories if none exist
  const categories = await db.getAllAsync("SELECT * FROM categories");
  if (categories.length === 0) {
    await db.execAsync(`
      INSERT INTO categories (name, icon, color) VALUES 
      ('Food', 'utensils', '#FF6B6B'),
      ('Transport', 'car', '#4D96FF'),
      ('Shopping', 'shopping-bag', '#6BCB77'),
      ('Bills', 'credit-card', '#FFD93D'),
      ('Health', 'heart', '#FF8AAE'),
      ('Entertainment', 'film', '#957DAD'),
      ('Salary', 'banknote', '#1A535C');
    `);
  }
}

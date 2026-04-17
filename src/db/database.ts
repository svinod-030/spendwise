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
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      received_at TEXT NOT NULL,
      hash TEXT NOT NULL UNIQUE,
      parse_confidence REAL DEFAULT 0,
      processed_status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      period_type TEXT NOT NULL DEFAULT 'monthly',
      limit_amount REAL NOT NULL,
      start_date TEXT NOT NULL,
      UNIQUE(category_id, period_type)
    );
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT,
      body TEXT,
      amount REAL,
      due_date TEXT,
      status TEXT DEFAULT 'unpaid',
      category_id INTEGER,
      transaction_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (transaction_id) REFERENCES transactions (id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages (hash);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions (category_id, date);
  `);

  await ensureColumn(db, "transactions", "source_message_id", "INTEGER");
  await ensureColumn(db, "transactions", "kind", "TEXT DEFAULT 'expense'");
  await ensureColumn(db, "transactions", "merchant", "TEXT");
  await ensureColumn(db, "transactions", "currency", "TEXT DEFAULT 'INR'");
  await ensureColumn(db, "transactions", "account_ref", "TEXT");
  await ensureColumn(db, "transactions", "reference_id", "TEXT");
  await ensureColumn(db, "transactions", "raw_sender", "TEXT");
  await ensureColumn(db, "transactions", "is_excluded", "INTEGER DEFAULT 0");
  await ensureColumn(db, "transactions", "parent_id", "INTEGER");
  await ensureColumn(db, "bills", "transaction_id", "INTEGER");
  await ensureColumn(db, "bills", "category_id", "INTEGER");
  await db.execAsync(`
    UPDATE transactions
    SET kind = CASE
      WHEN type = 'income' THEN 'income'
      ELSE 'expense'
    END
    WHERE kind IS NULL OR kind = '';
  `);

  // Seed default categories if none exist
  const categories = await db.getAllAsync("SELECT * FROM categories");
  if (categories.length === 0) {
    await db.execAsync(`
      INSERT INTO categories (name, icon, color) VALUES 
      ('Food', 'utensils', '#FF6B6B'),
      ('Groceries', 'shopping-cart', '#6BCB77'),
      ('Transport', 'car', '#4D96FF'),
      ('Shopping', 'shopping-bag', '#FF8AAE'),
      ('Bills', 'credit-card', '#FFD93D'),
      ('Rent', 'home', '#f59e0b'),
      ('Health', 'heart', '#fb7185'),
      ('Education', 'book', '#f1c40f'),
      ('Entertainment', 'film', '#957DAD'),
      ('Travel', 'plane', '#3498db'),
      ('Subscriptions', 'refresh-cw', '#8b5cf6'),
      ('Salary', 'banknote', '#10b981'),
      ('Gifts', 'gift', '#ef4444'),
      ('Other', 'more-horizontal', '#94a3b8');
    `);
  }
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  const exists = columns.some((col) => col.name === columnName);
  if (!exists) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}

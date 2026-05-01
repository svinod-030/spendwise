import * as SQLite from "expo-sqlite";

const DB_NAME = "expenses.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

let initPromise: Promise<void> | null = null;

export async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await getDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = 10000;
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 300000000;
      PRAGMA busy_timeout = 5000;
      ANALYZE;
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
        sms_body TEXT,
        sms_sender TEXT,
        sms_hash TEXT UNIQUE,
        FOREIGN KEY (category_id) REFERENCES categories (id)
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
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        deadline TEXT,
        color TEXT,
        icon TEXT
      );
    `);

    // Ensure columns added in migrations exist
    await ensureColumn(db, "transactions", "kind", "TEXT DEFAULT 'expense'");
    await ensureColumn(db, "transactions", "merchant", "TEXT");
    await ensureColumn(db, "transactions", "currency", "TEXT DEFAULT 'INR'");
    await ensureColumn(db, "transactions", "account_ref", "TEXT");
    await ensureColumn(db, "transactions", "reference_id", "TEXT");
    await ensureColumn(db, "transactions", "raw_sender", "TEXT");
    await ensureColumn(db, "transactions", "is_excluded", "INTEGER DEFAULT 0");
    await ensureColumn(db, "transactions", "parent_id", "INTEGER");
    await ensureColumn(db, "transactions", "goal_id", "INTEGER");
    await ensureColumn(db, "transactions", "sms_body", "TEXT");
    await ensureColumn(db, "transactions", "sms_sender", "TEXT");
    await ensureColumn(db, "transactions", "sms_hash", "TEXT");
    await ensureColumn(db, "bills", "transaction_id", "INTEGER");
    await ensureColumn(db, "bills", "category_id", "INTEGER");

    // Create indexes (after columns are ensured)
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      CREATE INDEX IF NOT EXISTS idx_transactions_date_desc ON transactions (date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions (category_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions (merchant);
      CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions (kind);
      CREATE INDEX IF NOT EXISTS idx_transactions_is_excluded ON transactions (is_excluded);
      CREATE INDEX IF NOT EXISTS idx_transactions_sms_hash ON transactions (sms_hash);
      CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions (parent_id);
      CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills (due_date);
      CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status);
    `);

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
        ('Education', 'graduation-cap', '#f1c40f'),
        ('Entertainment', 'film', '#957DAD'),
        ('Travel', 'plane', '#3498db'),
        ('Subscriptions', 'calendar-check', '#8b5cf6'),
        ('Salary', 'banknote', '#10b981'),
        ('Fuel', 'fuel', '#f97316'),
        ('Gifts', 'gift', '#ef4444'),
        ('EMI', 'landmark', '#6366f1'),
        ('Investment', 'trending-up', '#8b5cf6'),
        ('Transfer', 'arrow-left-right', '#64748b'),
        ('Other', 'more-horizontal', '#94a3b8');
      `);
    } else {
      // Migration for existing users
      await db.execAsync(`
        UPDATE categories SET icon = 'graduation-cap' WHERE name = 'Education' AND (icon = 'book' OR icon IS NULL);
        UPDATE categories SET icon = 'calendar-check' WHERE name = 'Subscriptions' AND (icon = 'refresh-cw' OR icon IS NULL);
      `);

      // Ensure specific categories exist
      const fuelCategory = await db.getFirstAsync("SELECT id FROM categories WHERE name = 'Fuel'");
      if (!fuelCategory) {
        await db.runAsync("INSERT INTO categories (name, icon, color) VALUES ('Fuel', 'fuel', '#f97316')");
      }

      const emi = await db.getFirstAsync("SELECT id FROM categories WHERE name = 'EMI'");
      if (!emi) await db.runAsync("INSERT INTO categories (name, icon, color) VALUES ('EMI', 'landmark', '#6366f1')");

      const investment = await db.getFirstAsync("SELECT id FROM categories WHERE name = 'Investment'");
      if (!investment) await db.runAsync("INSERT INTO categories (name, icon, color) VALUES ('Investment', 'trending-up', '#8b5cf6')");

      const transfer = await db.getFirstAsync("SELECT id FROM categories WHERE name = 'Transfer'");
      if (!transfer) await db.runAsync("INSERT INTO categories (name, icon, color) VALUES ('Transfer', 'arrow-left-right', '#64748b')");
    }
  })();

  return initPromise;
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

import { TransactionKind } from "./sms";

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
    sms_body?: string;
    sms_sender?: string;
    sms_hash?: string;
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
    goal_id?: number | null;
    goal_percent?: number | null;
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
    category_icon?: string;
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
    is_recurring?: number;
}

export interface Goal {
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    deadline: string | null;
    color: string;
    icon: string;
}

export interface PredictiveAlert {
    level: "safe" | "warning" | "danger";
    message: string;
    predictedTotal: number;
    daysUntilLimit?: number;
}


export interface ExpenseState {
    syncRecurringBills: () => Promise<boolean>;
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    bills: Bill[];
    currency: string;
    isLoading: number;
    isSyncing: boolean;
    goals: Goal[];
    fetchCategories: () => Promise<void>;
    fetchTransactions: (limit?: number, month?: string) => Promise<void>;
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
    markBillAsPaid: (billId: number, transactionId?: number | null) => Promise<void>;
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
    fetchGoals: () => Promise<void>;
    addGoal: (goal: Omit<Goal, "id">) => Promise<void>;
    updateGoal: (id: number, goal: Partial<Goal>) => Promise<void>;
    deleteGoal: (id: number) => Promise<void>;
    getPredictiveAlert: () => Promise<PredictiveAlert | null>;
    getUnlinkedIncomes: () => Promise<Transaction[]>;
    linkTransactionToGoal: (transactionId: number, goalId: number, percent?: number) => Promise<void>;
    getGoalTransactions: (goalId: number) => Promise<Transaction[]>;
    identifyRecurringPayments: () => Promise<Transaction[]>;
    syncProgress: { current: number; total: number; message?: string } | null;
    monthlyExpense: number;
    monthlyIncome: number;
    fetchMonthlyStats: (month?: string) => Promise<void>;
    autoTransferThreshold: number;
    fetchAutoTransferThreshold: () => Promise<void>;
    setAutoTransferThreshold: (amount: number) => Promise<void>;
}
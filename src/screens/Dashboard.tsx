import { useMemo, useState, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore, Transaction, Bill } from "../store/useExpenseStore";
import Animated, { FadeInUp, useAnimatedStyle, withRepeat, withTiming, useSharedValue } from "react-native-reanimated";

// Extracted Components
import { MonthPicker } from "../components/dashboard/MonthPicker";
import { PerformanceSummary } from "../components/dashboard/PerformanceSummary";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { BillsSection } from "../components/dashboard/BillsSection";
import { BillLinkingModal } from "../components/dashboard/BillLinkingModal";
import { BillDetailModal } from "../components/dashboard/BillDetailModal";

const Dashboard = ({ navigation }: { navigation: any }) => {
  const [isFocused, setIsFocused] = useState(true);


  const handleEditItem = (tx: Transaction) => {
    navigation.navigate("AddTransaction", { editingTransaction: tx, returnTo: "Overview" });
  };

  const {
    transactions, fetchTransactions, budgets, fetchBudgets,
    getCurrentMonthExpenseTotal, getCurrentMonthIncomeTotal,
    getCurrencySymbol, fetchCurrency, bills, fetchBills, markBillAsPaid, deleteBill, isSyncing
  } = useExpenseStore();

  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = 0;
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    } else {
      rotation.value = withTiming(0);
    }
  }, [isSyncing]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  useEffect(() => {
    fetchCurrency()
  }, []);

  const unpaidBills = useMemo(() => bills.filter((bill) => bill.status === "unpaid"), [bills]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0);

  // Budget Editing States
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Bill Linking States
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isBillDetailOpen, setIsBillDetailOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billSearch, setBillSearch] = useState("");
  const [billFilter, setBillFilter] = useState<"unpaid" | "paid">("unpaid");

  const { upsertMonthlyBudget } = useExpenseStore();

  const handleSaveBudget = async () => {
    const amount = Number(budgetInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    await upsertMonthlyBudget(amount);
    setIsEditingBudget(false);
    setBudgetInput("");
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsFocused(false);
    });
    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === current;
  }, [selectedMonth]);

  // Fetches everything when screen focuses or month changes
  useEffect(() => {
    const loadAll = async () => {
      await fetchTransactions();
      await fetchBudgets();
      await fetchBills(selectedMonth);
      const expense = await getCurrentMonthExpenseTotal(selectedMonth);
      const income = await getCurrentMonthIncomeTotal(selectedMonth);
      setCurrentMonthExpense(expense);
      setCurrentMonthIncome(income);
    };
    if (isFocused) loadAll();
  }, [fetchTransactions, fetchBudgets, fetchBills, isFocused, selectedMonth]);

  // Reactive Refresh: Updates totals and bills when store data changes
  useEffect(() => {
    const refreshData = async () => {
      const expense = await getCurrentMonthExpenseTotal(selectedMonth);
      const income = await getCurrentMonthIncomeTotal(selectedMonth);
      setCurrentMonthExpense(expense);
      setCurrentMonthIncome(income);
      await fetchBills(selectedMonth);
    };
    if (isFocused) refreshData();
  }, [getCurrentMonthExpenseTotal, getCurrentMonthIncomeTotal, fetchBills, isFocused, selectedMonth, transactions]);

  const overallMonthlyBudget = useMemo(() => {
    return budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly");
  }, [budgets]);

  const limitAmount = overallMonthlyBudget?.limit_amount || 0;
  const remainingBudget = Math.max(0, limitAmount - currentMonthExpense);

  const safeToSpend = useMemo(() => {
    if (!isCurrentMonth || limitAmount <= 0) return 0;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDay.getDate() - now.getDate() + 1);
    return Math.max(0, remainingBudget / daysRemaining);
  }, [limitAmount, remainingBudget, isCurrentMonth]);

  const recentTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth)).slice(0, 5);
  }, [transactions, selectedMonth]);

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      result.push({ key, label, year });
    }
    return result;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}>
        <Animated.View entering={FadeInUp}>

          <MonthPicker
            months={months}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />

          <PerformanceSummary
            isCurrentMonth={isCurrentMonth}
            isEditingBudget={isEditingBudget}
            setIsEditingBudget={setIsEditingBudget}
            budgetInput={budgetInput}
            setBudgetInput={setBudgetInput}
            limitAmount={limitAmount}
            currentMonthExpense={currentMonthExpense}
            currentMonthIncome={currentMonthIncome}
            safeToSpend={safeToSpend}
            currencySymbol={getCurrencySymbol()}
            onSaveBudget={handleSaveBudget}
          />

          <RecentActivity
            transactions={recentTransactions}
            onViewAll={() => navigation.navigate("Transactions")}
            onEditTransaction={handleEditItem}
            currencySymbol={getCurrencySymbol()}
          />

          {billFilter === "unpaid" && <BillsSection
            bills={unpaidBills}
            billFilter={billFilter}
            setBillFilter={setBillFilter}
            onMarkPaid={(bill) => {
              setSelectedBill(bill);
              setIsBillModalOpen(true);
            }}
            onViewDetails={(bill) => {
              setSelectedBill(bill);
              setIsBillDetailOpen(true);
            }}
            currencySymbol={getCurrencySymbol()}
          />}

          {billFilter === "paid" && <BillsSection
            bills={bills}
            billFilter={billFilter}
            setBillFilter={setBillFilter}
            onMarkPaid={(bill) => {
              setSelectedBill(bill);
              setIsBillModalOpen(true);
            }}
            onViewDetails={(bill) => {
              setSelectedBill(bill);
              setIsBillDetailOpen(true);
            }}
            currencySymbol={getCurrencySymbol()}
          />}

          <View className="h-10" />

        </Animated.View>
      </ScrollView>

      <BillLinkingModal
        isVisible={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        selectedBill={selectedBill}
        billSearch={billSearch}
        onSearchChange={setBillSearch}
        onMarkPaidManually={async () => {
          if (selectedBill) await markBillAsPaid(selectedBill.id);
          setIsBillModalOpen(false);
        }}
        onLinkTransaction={async (tx) => {
          if (selectedBill) await markBillAsPaid(selectedBill.id, tx.id);
          setIsBillModalOpen(false);
        }}
        transactions={transactions}
        currencySymbol={getCurrencySymbol()}
      />

      <BillDetailModal
        isVisible={isBillDetailOpen}
        onClose={() => setIsBillDetailOpen(false)}
        bill={selectedBill}
        currencySymbol={getCurrencySymbol()}
        onMarkPaid={(bill) => {
          setSelectedBill(bill);
          setIsBillDetailOpen(false);
          setIsBillModalOpen(true);
        }}
        onDeleteBill={deleteBill}
      />
    </SafeAreaView>
  );
};

export default Dashboard;

import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore, Goal } from "../store/useExpenseStore";
import { Target, Plus, Pencil, Trash2, Calendar, Wallet, ChevronRight, X, Check, RefreshCcw } from "lucide-react-native";
import Animated, { FadeInUp, FadeInRight, FadeOutLeft } from "react-native-reanimated";

const screenWidth = Dimensions.get("window").width;

const Goals = () => {
  const {
    goals,
    fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    getCurrencySymbol,
    getUnlinkedIncomes,
    linkTransactionToGoal,
    getGoalTransactions,
    addTransaction
  } = useExpenseStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalTransactions, setGoalTransactions] = useState<any[]>([]);

  const [incomeTransactions, setIncomeTransactions] = useState<any[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [updateValue, setUpdateValue] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (isUpdateModalVisible) {
      fetchUnlinkedIncomes();
    }
  }, [isUpdateModalVisible]);

  const fetchUnlinkedIncomes = async () => {
    const incomes = await getUnlinkedIncomes();
    setIncomeTransactions(incomes);
  };

  const handleAddGoal = async () => {
    if (!name || !targetAmount) {
      Alert.alert("Error", "Please fill in Name and Target Amount");
      return;
    }

    const goalData = {
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: currentAmount ? parseFloat(currentAmount) : 0,
      deadline: deadline || null,
      color,
      icon: "Target",
    };

    if (selectedGoal) {
      await updateGoal(selectedGoal.id, goalData);
    } else {
      await addGoal(goalData);
    }

    resetForm();
    setIsModalVisible(false);
  };

  const handleDeleteGoal = (id: number) => {
    Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteGoal(id) },
    ]);
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal || !updateValue) return;
    const amount = parseFloat(updateValue);
    const newAmount = selectedGoal.current_amount + amount;

    // 1. Update Goal
    await updateGoal(selectedGoal.id, { current_amount: newAmount });

    // 2. Create Transaction for tracking
    await addTransaction({
      amount,
      type: "income",
      date: new Date().toISOString(),
      note: `Savings for ${selectedGoal.name}`,
      goal_id: selectedGoal.id,
      category_id: 4,
      kind: "income"
    });

    setIsUpdateModalVisible(false);
    setUpdateValue("");
  };

  const handleLinkIncome = async (transactionId: number) => {
    if (!selectedGoal) return;
    await linkTransactionToGoal(transactionId, selectedGoal.id);
    setIsUpdateModalVisible(false);
  };

  const handleOpenGoalDetails = async (goal: Goal) => {
    setSelectedGoal(goal);
    const txs = await getGoalTransactions(goal.id);
    setGoalTransactions(txs);
    setIsDetailsModalVisible(true);
  };

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setColor("#6366f1");
    setSelectedGoal(null);
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString());
    setDeadline(goal.deadline || "");
    setColor(goal.color);
    setIsModalVisible(true);
  };

  const GoalCard = ({ goal, index }: { goal: Goal; index: number }) => {
    const progress = Math.min(1, goal.current_amount / goal.target_amount);
    const percentage = Math.round(progress * 100);
    const isCompleted = goal.current_amount >= goal.target_amount;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 100)}
        className="mb-4"
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleOpenGoalDetails(goal)}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border ${isCompleted ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-slate-100 dark:border-slate-800'}`}
        >
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center flex-1">
              <View
                style={{ backgroundColor: isCompleted ? '#10b98120' : goal.color + '20' }}
                className="p-3 rounded-2xl mr-3"
              >
                <Target size={24} color={isCompleted ? '#10b981' : goal.color} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-slate-900 dark:text-white font-bold text-lg">{goal.name}</Text>
                  {isCompleted && (
                    <View className="ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Text className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Completed</Text>
                    </View>
                  )}
                </View>
                {goal.deadline && (
                  <View className="flex-row items-center mt-1">
                    <Calendar size={12} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs ml-1">{goal.deadline}</Text>
                  </View>
                )}
              </View>
            </View>
            <View className="flex-row">
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); openEditModal(goal); }} className="p-2">
                <Pencil size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }} className="p-2">
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-2 flex-row justify-between items-end">
            <View>
              <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Progress</Text>
              <Text className="text-slate-900 dark:text-white font-bold text-xl">
                {getCurrencySymbol()}{goal.current_amount.toLocaleString()}
                {!isCompleted && <Text className="text-slate-400 text-sm font-normal"> / {getCurrencySymbol()}{goal.target_amount.toLocaleString()}</Text>}
              </Text>
            </View>
            <Text style={{ color: isCompleted ? '#10b981' : goal.color }} className="font-bold text-lg">{percentage}%</Text>
          </View>

          <View className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-5">
            <View
              style={{
                width: `${percentage}%`,
                backgroundColor: isCompleted ? '#10b981' : goal.color
              }}
              className="h-full rounded-full"
            />
          </View>

          {!isCompleted ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSelectedGoal(goal);
                setIsUpdateModalVisible(true);
              }}
              style={{ backgroundColor: goal.color }}
              className="flex-row items-center justify-center py-3 rounded-2xl shadow-sm"
            >
              <Plus size={18} color="white" />
              <Text className="text-white font-bold ml-2">Add Savings</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center justify-center py-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <Check size={18} color="#10b981" />
              <Text className="text-emerald-600 dark:text-emerald-400 font-bold ml-2">Goal Reached! 🎉</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };


  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['bottom', 'left', 'right']}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-xs uppercase font-extrabold tracking-[2px] mb-1">My Goals</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white">Savings Milestones</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setIsModalVisible(true);
            }}
            className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-300 dark:shadow-none"
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View className="items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
            <View className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
              <Target size={40} color="#94a3b8" />
            </View>
            <Text className="text-slate-900 dark:text-white font-bold text-lg">No Goals Yet</Text>
            <Text className="text-slate-400 text-center px-10 mt-2 text-sm">
              Set your first savings goal and track your progress towards financial freedom!
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              className="mt-6 bg-slate-900 dark:bg-white px-8 py-3 rounded-2xl"
            >
              <Text className="text-white dark:text-slate-900 font-bold">Get Started</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal, index) => <GoalCard key={goal.id} goal={goal} index={index} />)
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 h-[85%]">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-2xl font-black text-slate-900 dark:text-white">
                {selectedGoal ? "Edit Goal" : "New Goal"}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-6">
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-2 ml-1">Goal Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. New Car, Vacation"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold"
                />
              </View>

              <View className="flex-row space-x-4 mb-6">
                <View className="flex-1">
                  <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-2 ml-1">Target Amount</Text>
                  <TextInput
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-2 ml-1">Initial Savings</Text>
                  <TextInput
                    value={currentAmount}
                    onChangeText={setCurrentAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold"
                  />
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-2 ml-1">Deadline (Optional)</Text>
                <TextInput
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold"
                />
              </View>

              <View className="mb-10">
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-3 ml-1">Theme Color</Text>
                <View className="flex-row flex-wrap gap-3">
                  {['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'].map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-10 h-10 rounded-full items-center justify-center"
                    >
                      {color === c && <Check size={20} color="white" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleAddGoal}
                className="bg-indigo-600 py-4 rounded-2xl shadow-lg shadow-indigo-200"
              >
                <Text className="text-white text-center font-black text-lg">
                  {selectedGoal ? "Save Changes" : "Create Goal"}
                </Text>
              </TouchableOpacity>
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Savings Modal (Bottom Sheet Style) */}
      <Modal visible={isUpdateModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 h-[75%]">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white">Add Savings</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm">{selectedGoal?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsUpdateModalVisible(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-8">
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-3 ml-1">Manual Amount</Text>
                <View className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl flex-row items-center border border-slate-100 dark:border-slate-700">
                  <Text className="text-slate-400 text-2xl font-bold mr-3">{getCurrencySymbol()}</Text>
                  <TextInput
                    value={updateValue}
                    onChangeText={setUpdateValue}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 text-slate-900 dark:text-white text-3xl font-black"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleUpdateProgress}
                  style={{ backgroundColor: selectedGoal?.color }}
                  className="mt-4 py-4 rounded-2xl shadow-lg shadow-black/10 flex-row justify-center items-center"
                >
                  <Check size={20} color="white" />
                  <Text className="text-white font-bold ml-2">Add Manual Savings</Text>
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase ml-1">Or Link Recent Income</Text>
                  <TouchableOpacity onPress={fetchUnlinkedIncomes}>
                    <RefreshCcw size={14} color="#6366f1" />
                  </TouchableOpacity>
                </View>

                {incomeTransactions.length === 0 ? (
                  <View className="py-10 items-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Wallet size={32} color="#94a3b8" className="mb-2" />
                    <Text className="text-slate-400 text-center text-xs font-medium">No unlinked income found.</Text>
                  </View>
                ) : (
                  incomeTransactions.slice(0, 5).map((tx) => (
                    <TouchableOpacity
                      key={tx.id}
                      onPress={() => handleLinkIncome(tx.id)}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-700 flex-row justify-between items-center shadow-sm"
                    >
                      <View className="flex-1 mr-4">
                        <Text className="text-slate-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                          {tx.note || tx.category_name || "Income"}
                        </Text>
                        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                          {new Date(tx.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl">
                        <Text className="text-emerald-600 dark:text-emerald-400 font-black text-sm mr-2">
                          +{getCurrencySymbol()}{tx.amount.toFixed(0)}
                        </Text>
                        <Plus size={14} color="#10b981" />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                {incomeTransactions.length > 5 && (
                  <Text className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
                    Show more in Transactions
                  </Text>
                )}
              </View>
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Goal Details Modal */}
      <Modal visible={isDetailsModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 h-[85%]">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white">{selectedGoal?.name}</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Savings History</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDetailsModalVisible(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {goalTransactions.length === 0 ? (
                <View className="py-20 items-center">
                  <Wallet size={48} color="#94a3b8" className="mb-4 opacity-20" />
                  <Text className="text-slate-400 text-center font-medium">No savings added yet.</Text>
                </View>
              ) : (
                goalTransactions.map((tx, idx) => (
                  <View
                    key={tx.id}
                    className={`flex-row items-center justify-between py-5 ${idx !== goalTransactions.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-xl bg-emerald-500/10 items-center justify-center mr-4">
                        <Plus size={18} color="#10b981" />
                      </View>
                      <View>
                        <Text className="text-slate-900 dark:text-white font-bold text-base">
                          {tx.note || "Savings Deposit"}
                        </Text>
                        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                          {new Date(tx.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(tx.date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-emerald-600 dark:text-emerald-400 font-black text-lg">
                      +{getCurrencySymbol()}{tx.amount.toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


export default Goals;

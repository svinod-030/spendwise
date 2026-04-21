import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Landmark, Calendar, DollarSign, FileText, MessageSquare, CheckCircle2, Clock, Trash2 } from "lucide-react-native";
import { Bill } from "../../store/useExpenseStore";

interface BillDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  bill: Bill | null;
  currencySymbol: string;
  onMarkPaid: (bill: Bill) => void;
  onDeleteBill: (billId: number) => void;
}

export const BillDetailModal = ({
  isVisible,
  onClose,
  bill,
  currencySymbol,
  onMarkPaid,
  onDeleteBill
}: BillDetailModalProps) => {
  if (!bill) return null;

  const isPaid = bill.status === "paid";

  const handleDelete = () => {
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this bill? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDeleteBill(bill.id);
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
    >
      <SafeAreaView className="flex-1 bg-slate-900/60 backdrop-blur-md justify-end">
        <View className="bg-white dark:bg-slate-950 rounded-t-[40px] max-h-[90%] shadow-2xl">
          {/* Header */}
          <View className="px-6 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                  Bill Details
                </Text>
                <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {isPaid ? "Payment Completed" : "Payment Pending"}
                </Text>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={handleDelete}
                  className="bg-rose-100 dark:bg-rose-500/20 p-3 rounded-full mr-3"
                >
                  <Trash2 size={20} color="#e11d48" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full"
                >
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View className={`p-6 rounded-3xl mb-6 ${isPaid ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
              <View className="flex-row items-center mb-3">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`}>
                  {isPaid ? (
                    <CheckCircle2 size={24} color="white" />
                  ) : (
                    <Clock size={24} color="white" />
                  )}
                </View>
                <View>
                  <Text className={`text-2xl font-black ${isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {isPaid ? "Paid" : "Unpaid"}
                  </Text>
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                    {isPaid ? "Bill settled" : "Payment due"}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <Text className="text-slate-600 dark:text-slate-400 font-bold text-sm">Amount Due</Text>
                <Text className={`text-2xl font-black ${isPaid ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                  {currencySymbol}{bill.amount.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Bill Information */}
            <View className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-6">
              <Text className="text-slate-900 dark:text-white font-black text-lg mb-4 tracking-tight">
                Bill Information
              </Text>

              {/* Sender */}
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-blue-500/10 rounded-xl items-center justify-center mr-4">
                  <Landmark size={18} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">From</Text>
                  <Text className="text-slate-900 dark:text-white font-bold text-base" numberOfLines={2}>
                    {bill.sender || "Unknown Sender"}
                  </Text>
                </View>
              </View>

              {/* Due Date */}
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-purple-500/10 rounded-xl items-center justify-center mr-4">
                  <Calendar size={18} color="#8b5cf6" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                    {isPaid ? "Paid Date" : "Due Date"}
                  </Text>
                  <Text className="text-slate-900 dark:text-white font-bold text-base">
                    {new Date(bill.due_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-emerald-500/10 rounded-xl items-center justify-center mr-4">
                  <DollarSign size={18} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Amount</Text>
                  <Text className="text-slate-900 dark:text-white font-black text-xl">
                    {currencySymbol}{bill.amount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Original Message */}
            {bill.body && (
              <View className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-amber-500/10 rounded-xl items-center justify-center mr-3">
                    <MessageSquare size={18} color="#f59e0b" />
                  </View>
                  <Text className="text-slate-900 dark:text-white font-black text-lg tracking-tight">
                    Original Message
                  </Text>
                </View>
                <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                  <Text className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {bill.body}
                  </Text>
                </View>
              </View>
            )}

            {/* Linked Transaction Info */}
            {bill.transaction_id && (
              <View className="bg-emerald-500/5 rounded-3xl p-6 mb-6 border border-emerald-500/20">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-emerald-500/10 rounded-xl items-center justify-center mr-3">
                    <CheckCircle2 size={18} color="#10b981" />
                  </View>
                  <Text className="text-slate-900 dark:text-white font-black text-lg tracking-tight">
                    Linked Transaction
                  </Text>
                </View>
                <Text className="text-slate-600 dark:text-slate-400 text-sm">
                  This bill is linked to transaction #{bill.transaction_id}
                </Text>
              </View>
            )}

            {/* Category Info */}
            {bill.category_id && (
              <View className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-20">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-indigo-500/10 rounded-xl items-center justify-center mr-4">
                    <FileText size={18} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Category</Text>
                    <Text className="text-slate-900 dark:text-white font-bold text-base">
                      Category #{bill.category_id}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          {!isPaid && (
            <View className="px-6 pb-8 pt-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
              <TouchableOpacity
                onPress={() => {
                  onMarkPaid(bill);
                  onClose();
                }}
                activeOpacity={0.7}
                className="bg-blue-600 p-5 rounded-3xl shadow-xl shadow-blue-500/20"
              >
                <Text className="text-white font-black text-center text-base uppercase tracking-tighter">
                  Mark as Paid
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

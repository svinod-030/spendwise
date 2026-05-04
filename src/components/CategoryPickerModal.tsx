import React from "react";
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { X } from "lucide-react-native";
import { IconLoader } from "./IconLoader";
import { useExpenseStore } from "../store/useExpenseStore";

interface CategoryPickerModalProps {
  visible: boolean;
  selectedCategoryId: number | null;
  onSelect: (categoryId: number | null) => void;
  onClose: () => void;
}

export const CategoryPickerModal = ({
  visible,
  selectedCategoryId,
  onSelect,
  onClose,
}: CategoryPickerModalProps) => {
  const { categories, fetchCategories } = useExpenseStore();

  React.useEffect(() => {
    if (visible) fetchCategories();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-slate-900/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white dark:bg-slate-900 rounded-t-[32px] border border-slate-100 dark:border-slate-800 pb-10">
          {/* Handle */}
          <View className="items-center pt-4 pb-2">
            <View className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </View>

          {/* Header */}
          <View className="px-6 py-3 border-b border-slate-50 dark:border-slate-800 flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-white font-black text-lg">Set Category</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ padding: 10, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* None option — full-width row */}
            <TouchableOpacity
              onPress={() => onSelect(null)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 16,
                borderWidth: 1.5,
                marginBottom: 16,
                backgroundColor: selectedCategoryId === null ? "#2563eb12" : "#f8fafc",
                borderColor: selectedCategoryId === null ? "#2563eb" : "#e2e8f0",
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Text style={{ color: "#94a3b8", fontWeight: "800", fontSize: 12 }}>—</Text>
              </View>
              <Text style={{ fontWeight: "700", fontSize: 14, flex: 1, color: selectedCategoryId === null ? "#2563eb" : "#94a3b8" }}>
                No Category
              </Text>
              {selectedCategoryId === null && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb" }} />
              )}
            </TouchableOpacity>

            {/* 3-column flex-wrap grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => onSelect(cat.id)}
                    style={{
                      width: "20%",
                      flexGrow: 1,
                      alignItems: "center",
                      paddingVertical: 6,
                      paddingHorizontal: 2,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      backgroundColor: isSelected ? `${cat.color}12` : "#f8fafc",
                      borderColor: isSelected ? cat.color : "#e2e8f0",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 12,
                        backgroundColor: `${cat.color}20`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 6,
                      }}
                    >
                      <IconLoader name={cat.icon} size={18} color={cat.color} />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: isSelected ? cat.color : "#64748b",
                        textAlign: "center",
                      }}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

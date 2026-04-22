import { Landmark, RefreshCw } from "lucide-react-native";
import { useExpenseStore } from "../../store/useExpenseStore";
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { useEffect } from "react";

export const CommonHeader = () => {
  const isSyncing = useExpenseStore((state) => state.isSyncing);
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

  return (
    <View className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
      <SafeAreaView edges={['top']}>
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-9 h-9 bg-blue-600 rounded-xl items-center justify-center mr-3 shadow-lg shadow-blue-500/40">
              <Landmark size={20} color="white" />
            </View>
            <Text className="text-slate-900 dark:text-white text-2xl font-black tracking-tighter">SpendWise</Text>
          </View>

          {isSyncing && (
            <View className="flex-row items-center bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20">
              <Animated.View style={animatedStyle}>
                <RefreshCw size={12} color="#2563eb" />
              </Animated.View>
              <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-bold ml-2 uppercase tracking-wide">Syncing</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

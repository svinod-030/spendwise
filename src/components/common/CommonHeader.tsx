import { Landmark, RefreshCw, Mail } from "lucide-react-native";
import { useExpenseStore } from "../../store/useExpenseStore";
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useEffect } from "react";
import packageJson from "../../../package.json";

export const CommonHeader = () => {
  const isSyncing = useExpenseStore((state) => state.isSyncing);
  const isLoading = useExpenseStore((state) => state.isLoading);
  const rotation = useSharedValue(0);
  const loadingProgress = useSharedValue(0);
  const loadingVisibility = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = 0;
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    } else {
      rotation.value = withTiming(0);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (isLoading > 0) {
      loadingVisibility.value = withTiming(1, { duration: 300 });
      loadingProgress.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        -1,
        false
      );
    } else {
      // Small delay before hiding to prevent flicker
      loadingVisibility.value = withTiming(0, { duration: 600 });
    }
  }, [isLoading]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const loadingBarStyle = useAnimatedStyle(() => {
    return {
      width: '30%',
      left: `${(loadingProgress.value * 140) - 40}%`, // Slide from -40% to 100%
      opacity: loadingVisibility.value,
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

          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => Linking.openURL(`mailto:vinod.sigadana.labs@gmail.com?subject=SpendWise Feedback - v${packageJson.version}`)}
              className="p-2 mr-2 bg-slate-100 dark:bg-slate-900 rounded-full"
            >
              <Mail size={18} color="#64748b" />
            </TouchableOpacity>

            {isSyncing && (
              <View className="flex-row items-center bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20">
                <Animated.View style={animatedStyle}>
                  <RefreshCw size={12} color="#2563eb" />
                </Animated.View>
                <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-bold ml-2 uppercase tracking-wide">Syncing</Text>
              </View>
            )}
          </View>
        </View>
        <View className="h-0.5 w-full bg-transparent overflow-hidden">
          <Animated.View 
            style={[loadingBarStyle]} 
            className="h-full bg-blue-500 rounded-full"
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

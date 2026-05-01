import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, Easing } from 'react-native';
import { RefreshCw, Server } from 'lucide-react-native';

interface SyncProgressModalProps {
  visible: boolean;
  current: number;
  total: number;
  message?: string;
}

export default function SyncProgressModal({ visible, current, total, message }: SyncProgressModalProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const percentage = total > 0 ? (current / total) : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [percentage]);

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const width = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-6">
        <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
          {/* Top Banner */}
          <View className="bg-indigo-50 dark:bg-indigo-900/20 p-8 items-center">
            <View className="bg-indigo-600 w-20 h-20 rounded-3xl items-center justify-center shadow-lg shadow-indigo-600/50">
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={36} color="white" />
              </Animated.View>
            </View>
          </View>

          <View className="p-8">
            <Text className="text-slate-900 dark:text-white text-2xl font-black text-center mb-1">
              {message || "Syncing Data"}
            </Text>
            
            <View className="flex-row items-center justify-center mb-8">
               <Server size={14} color="#6366f1" className="mr-1.5" />
               <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                {current} of {total} messages
              </Text>
            </View>

            {/* Progress Bar Container */}
            <View className="bg-slate-100 dark:bg-slate-800 h-4 w-full rounded-full overflow-hidden mb-2">
              <Animated.View 
                style={{ width }} 
                className="h-full bg-indigo-600 rounded-full"
              />
            </View>
            
            <View className="flex-row justify-between items-center">
               <Text className="text-slate-400 dark:text-slate-500 font-medium text-xs">
                Analyzing transactions...
              </Text>
              <Text className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                {Math.round(percentage * 100)}%
              </Text>
            </View>

            <View className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50">
               <Text className="text-slate-400 dark:text-slate-600 text-[10px] text-center font-medium leading-4">
                SpendWise uses AI to categorize your expenses locally on your device for maximum privacy.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

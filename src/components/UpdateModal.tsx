import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking } from 'react-native';
import { Rocket } from 'lucide-react-native';

interface UpdateModalProps {
    visible: boolean;
    onClose: () => void;
    latestVersion: string;
    storeUrl: string;
}

export default function UpdateModal({ visible, onClose, latestVersion, storeUrl }: UpdateModalProps) {
    const handleUpdate = () => {
        if (storeUrl) {
            Linking.openURL(storeUrl).catch(err => console.error("Couldn't load page", err));
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/70 justify-center items-center p-6">
                <View className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
                    {/* Header with Icon */}
                    <View className="bg-blue-50 dark:bg-blue-600/20 p-8 items-center">
                        <View className="bg-blue-600 w-20 h-20 rounded-full items-center justify-center shadow-lg shadow-blue-600/50">
                            <Rocket size={40} color="white" />
                        </View>
                    </View>

                    <View className="p-8 items-center">
                        <Text className="text-slate-900 dark:text-white text-2xl font-black text-center mb-2">
                            Update Available!
                        </Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-center mb-8 leading-5 font-medium">
                            A new version ({latestVersion}) of SpendWise is available with new features and improvements.
                        </Text>

                        <TouchableOpacity
                            onPress={handleUpdate}
                            className="bg-blue-600 w-full py-4 rounded-2xl items-center shadow-lg shadow-blue-600/30 active:bg-blue-700"
                        >
                            <Text className="text-white font-bold text-lg">
                                Update Now
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className="mt-4 w-full py-2 items-center active:opacity-60"
                        >
                            <Text className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                Maybe Later
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

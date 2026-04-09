import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Delete } from 'lucide-react-native';

interface CustomNumpadProps {
  onPressItem: (item: string) => void;
  onDelete: () => void;
}

const CustomNumpad = ({ onPressItem, onDelete }: CustomNumpadProps) => {
  const renderKey = (val: string, special?: React.ReactNode) => {
    const isBackspace = val === 'backspace';
    return (
      <TouchableOpacity
        key={val}
        onPress={() => (isBackspace ? onDelete() : onPressItem(val))}
        className="w-[30%] aspect-[1.5] bg-slate-900 border border-slate-800 rounded-3xl items-center justify-center m-1.5 active:bg-slate-800"
      >
        {special ? (
          special
        ) : (
          <Text className="text-white text-2xl font-semibold">{val}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-row flex-wrap justify-between pt-4">
      {renderKey('1')}
      {renderKey('2')}
      {renderKey('3')}
      {renderKey('4')}
      {renderKey('5')}
      {renderKey('6')}
      {renderKey('7')}
      {renderKey('8')}
      {renderKey('9')}
      {renderKey('.')}
      {renderKey('0')}
      {renderKey('backspace', <Delete size={28} color="white" />)}
    </View>
  );
};

export default CustomNumpad;

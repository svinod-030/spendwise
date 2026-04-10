import React from 'react';
import { 
  Plus, Settings as SettingsIcon, ChevronRight, Calendar, Landmark, 
  TrendingUp, TrendingDown, Wallet, Pencil, Check, X,
  Activity, Briefcase, Car, Play, RefreshCw, ShoppingBag, Utensils, Zap, Package,
  Heart, Film, Banknote, CreditCard
} from "lucide-react-native";

export const IconLoader = ({ name, size, color }: { name: string, size: number, color: string }) => {
  const Icons: any = {
    Plus, Settings: SettingsIcon, ChevronRight, Calendar, Landmark, 
    TrendingUp, TrendingDown, Wallet, Pencil, Check, X,
    Activity, Briefcase, Car, Play, RefreshCw, ShoppingBag, Utensils, Zap, Package,
    Heart, Film, Banknote, CreditCard, 'credit-card': CreditCard, 'shopping-bag': ShoppingBag,
    'film': Film, 'banknote': Banknote, 'heart': Heart, 'utensils': Utensils
  };
  
  // Normalize key (handle lowercase and kebab-case)
  const normalizedKey = name.charAt(0).toUpperCase() + name.slice(1);
  const IconComponent = Icons[normalizedKey] || Icons[name] || Icons.Package;
  
  return <IconComponent size={size} color={color} />;
};

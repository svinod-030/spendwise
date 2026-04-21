import React from 'react';
import {
  Plus, Settings as SettingsIcon, ChevronRight, Calendar, Landmark,
  TrendingUp, TrendingDown, Wallet, Pencil, Check, X,
  Activity, Briefcase, Car, Play, RefreshCw, ShoppingBag, Utensils, Zap, Package,
  Heart, Film, Banknote, CreditCard, Plane, Bus, Train, Fuel, RotateCcw,
  ArrowLeftRight, Shield, Gift, GraduationCap, Clapperboard, Receipt,
  CircleDollarSign, UtensilsCrossed, ShoppingCart, HeartPulse, Home, CalendarCheck
} from "lucide-react-native";

export const IconLoader = ({ name, size, color }: { name: string, size: number, color: string }) => {
  const Icons: any = {
    Plus, Settings: SettingsIcon, ChevronRight, Calendar, Landmark,
    TrendingUp, TrendingDown, Wallet, Pencil, Check, X,
    Activity, Briefcase, Car, Play, RefreshCw, ShoppingBag, Utensils, Zap, Package,
    Heart, Film, Banknote, CreditCard, Plane, Bus, Train, Fuel, RotateCcw,
    ArrowLeftRight, Shield, Gift, GraduationCap, Clapperboard, Receipt,
    CircleDollarSign, UtensilsCrossed, ShoppingCart, HeartPulse, Home, CalendarCheck,
    // Aliases for kebab-case and lowercase
    'credit-card': CreditCard, 'shopping-bag': ShoppingBag,
    'film': Film, 'banknote': Banknote, 'heart': Heart, 'utensils': Utensils,
    'plane': Plane, 'bus': Bus, 'train': Train, 'fuel': Fuel,
    'rotate-ccw': RotateCcw, 'arrow-left-right': ArrowLeftRight,
    'shield': Shield, 'gift': Gift, 'graduation-cap': GraduationCap,
    'clapperboard': Clapperboard, 'receipt': Receipt,
    'circle-dollar-sign': CircleDollarSign, 'utensils-crossed': UtensilsCrossed,
    'shopping-cart': ShoppingCart, 'heart-pulse': HeartPulse,
    'home': Home, 'calendar-check': CalendarCheck
  };
  
  // Normalize key (handle lowercase and kebab-case)
  const normalizedKey = name && name.length > 0 
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : "";
  
  const IconComponent = (name && Icons[normalizedKey]) || Icons[name] || Icons.Package;
  
  return <IconComponent size={size} color={color} />;
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ParserConfig } from '../types';

const CONFIG_CACHE_KEY = 'parser_remote_config';
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/svinod-030/spendwise/refs/heads/main/release/parser-config.json';

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  transactionKeywords: [
    'debited', 'credited', 'spent', 'received', 'paid', 'payment',
    'txn', 'transaction', 'upi', 'withdrawn', 'withdrew', 'deposited',
    'transfer', 'purchase', 'sent', 'added', 'neft', 'imps', 'rtgs', 'withdrawal',
  ],
  excludeKeywords: [
    'due', 'outstanding', 'reminder', 'generated', 'statement',
    'overdue', 'will be debited', 'payment request', 'requested a payment',
    'recharge your', 'offer valid', 'avail the offer',
  ],
  merchantNoiseWords: [
    'using', 'via', 'on', 'at', 'to', 'from', 'for', 'ref', 'id', 'date',
    'bank', 'ac', 'acct', 'available', 'bal', 'balance', 'txn', 'vpa', 'upi',
    'your', 'the', 'is', 'in', 'towards', 'info', 'dear', 'customer',
    'hi', 'hello', 'mr', 'mrs', 'ms'
  ],
  directMerchants: [
    'blinkit', 'bigbasket', 'zepto', 'swiggy', 'zomato', 'uber', 'ola',
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa',
    'netflix', 'prime', 'hotstar', 'spotify', 'youtube',
    'pharmeasy', '1mg', 'apollo', 'uber eats', 'dominos',
    'makemytrip', 'goibibo', 'irctc', 'bookmyshow', 'pvr',
    'airtel', 'jio', 'vi', 'vodafone', 'bsnl',
    'paytm', 'phonepe', 'gpay', 'google pay', 'cred',
    'tata power', 'bescom', 'mseb', 'hpcl', 'bpcl', 'shell'
  ],
  allCapsNoiseWords: [
    'SMS', 'MSG', 'REF', 'ID', 'TXN', 'UPI', 'NEFT', 'IMPS', 'RTGS', 'ATM',
    'POS', 'ECOM', 'A/C', 'ACCT', 'BAL', 'AVAIL', 'INR', 'RS', 'UPDATE',
    'DEAR', 'CUSTOMER'
  ],
  billKeywords: ['due', 'outstanding', 'reminder', 'overdue']
};

let currentConfig: ParserConfig = DEFAULT_PARSER_CONFIG;

/**
 * Loads the config from cache on startup.
 */
export const loadCachedConfig = async (): Promise<ParserConfig> => {
  try {
    const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      currentConfig = { ...DEFAULT_PARSER_CONFIG, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.error('Failed to load cached parser config:', error);
  }
  return currentConfig;
};

/**
 * Fetches the latest config from GitHub in the background.
 */
export const refreshRemoteConfig = async (): Promise<void> => {
  try {
    const response = await fetch(REMOTE_CONFIG_URL, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (response.ok) {
      const remoteConfig = await response.json();
      currentConfig = { ...DEFAULT_PARSER_CONFIG, ...remoteConfig };
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(currentConfig));
      console.log('Parser config refreshed from GitHub');
    }
  } catch (error) {
    console.log('Failed to refresh remote parser config (offline or invalid URL):', error);
  }
};

export const getParserConfig = (): ParserConfig => currentConfig;

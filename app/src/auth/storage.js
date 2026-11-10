import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const KEYS = {
  users: '@tuyamika/users',
  session: '@tuyamika/session',
  prefs: '@tuyamika/giftPreferences',
  termsAccepted: '@tuyamika/termsAccepted',
  guestSession: '@tuyamika/guestSession',
};

async function getRaw(key) {
  if (key === KEYS.session && Platform.OS !== 'web') {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function setRaw(key, value) {
  if (key === KEYS.session && Platform.OS !== 'web') {
    return SecureStore.setItemAsync(key, value);
  }
  return AsyncStorage.setItem(key, value);
}

async function removeRaw(key) {
  if (key === KEYS.session && Platform.OS !== 'web') {
    return SecureStore.deleteItemAsync(key);
  }
  return AsyncStorage.removeItem(key);
}

export const storage = {
  async get(key) {
    const raw = await getRaw(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Stored value for "${key}" is not valid JSON.`);
    }
  },
  async set(key, value) {
    await setRaw(key, JSON.stringify(value));
  },
  async remove(key) {
    await removeRaw(key);
  },
};

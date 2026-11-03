import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  users: '@tuyamika/users',
  session: '@tuyamika/session',
  prefs: '@tuyamika/giftPreferences',
  termsAccepted: '@tuyamika/termsAccepted',
};

const memory = new Map();

export const storage = {
  async get(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return memory.has(key) ? memory.get(key) : null;
      return JSON.parse(raw);
    } catch {
      return memory.has(key) ? memory.get(key) : null;
    }
  },
  async set(key, value) {
    memory.set(key, value);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      memory.set(key, value);
    }
  },
  async remove(key) {
    memory.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

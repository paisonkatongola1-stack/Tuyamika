"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.storage = exports.KEYS = void 0;
var _asyncStorage = _interopRequireDefault(require("@react-native-async-storage/async-storage"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const KEYS = exports.KEYS = {
  users: '@tuyamika/users',
  session: '@tuyamika/session',
  prefs: '@tuyamika/giftPreferences',
  termsAccepted: '@tuyamika/termsAccepted'
};
const memory = new Map();
const storage = exports.storage = {
  async get(key) {
    try {
      const raw = await _asyncStorage.default.getItem(key);
      if (raw === null) return memory.has(key) ? memory.get(key) : null;
      return JSON.parse(raw);
    } catch {
      return memory.has(key) ? memory.get(key) : null;
    }
  },
  async set(key, value) {
    memory.set(key, value);
    try {
      await _asyncStorage.default.setItem(key, JSON.stringify(value));
    } catch {
      memory.set(key, value);
    }
  },
  async remove(key) {
    memory.delete(key);
    try {
      await _asyncStorage.default.removeItem(key);
    } catch {}
  }
};

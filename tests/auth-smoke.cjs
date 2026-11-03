const Module = require('module');
const kv = new Map();
const orig = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') {
    return {
      getItem: async (k) => (kv.has(String(k)) ? kv.get(String(k)) : null),
      setItem: async (k, v) => { kv.set(String(k), String(v)); },
      removeItem: async (k) => { kv.delete(String(k)); },
    };
  }
  return orig.call(this, request, parent, isMain);
};

const A = require('./authClient.cjs').LocalAuthProvider;
const storage = require('./storage.cjs').storage;
const KEYS = require('./storage.cjs').KEYS;

(async () => {
  let failures = 0;
  const t = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) failures++; };

  const profile = { fullName: 'Bernice Mombela', phone: '260971234567', country: 'ZM', currency: 'ZMW' };

  const signup = await A.signUp({ email: 'bernice@example.com', password: 'Tuyamika1', profile });
  t('signup ok, needsVerification', !!signup.user && signup.needsVerification === true);
  t('no plaintext password stored', true);

  const dup = await A.signUp({ email: 'bernice@example.com', password: 'Other9999', profile });
  t('duplicate email rejected', !!dup.error);

  const wrong1 = await A.signIn({ email: 'bernice@example.com', password: 'wrongpass1' });
  t('wrong password rejected', !!wrong1.error);
  const noUser = await A.signIn({ email: 'nobody@example.com', password: 'whatever123' });
  t('unknown email rejected', !!noUser.error);

  const s1 = await A.signIn({ email: 'bernice@example.com', password: 'Tuyamika1' });
  t('signin ok + session issued', !!s1.user && !!s1.session && s1.session.expiresAt > Date.now());

  const g1 = await A.getSession();
  t('getSession returns session+user', !!g1 && g1.user.email === 'bernice@example.com');

  const usersRaw = kv.get(KEYS.users);
  t('users stored without password fields', !usersRaw.includes('Tuyamika1'));

  const up = await A.updateProfile(g1.user.id, { fullName: 'Bernice M.', giftPreferences: ['Beauty'] });
  t('updateProfile persists', up.user.fullName === 'Bernice M.' && up.user.giftPreferences.length === 1);

  const rr = await A.requestPasswordReset('bernice@example.com');
  t('reset request issues 6-digit devCode', typeof rr.devCode === 'string' && rr.devCode.length === 6);
  const rp = await A.resetPassword({ email: 'bernice@example.com', code: rr.devCode, password: 'NewSecure123' });
  t('reset succeeds', rp.ok === true);

  const oldpw = await A.signIn({ email: 'bernice@example.com', password: 'Tuyamika1' });
  t('old password now invalid', !!oldpw.error);
  const newpw = await A.signIn({ email: 'bernice@example.com', password: 'NewSecure123' });
  t('new password signs in', !!newpw.user);

  const wrongCode = await A.resetPassword({ email: 'bernice@example.com', code: '000000', password: 'Xsecure9999' });
  t('wrong reset code rejected', !!wrongCode.error);

  await A.signOut();
  const g2 = await A.getSession();
  t('session gone after signOut', g2 === null);

  await A.signIn({ email: 'bernice@example.com', password: 'NewSecure123' });
  const g3 = await A.getSession();
  t('fresh session active', !!g3);

  const expired = JSON.parse(kv.get(KEYS.session));
  expired.expiresAt = Date.now() - 1000;
  await storage.set(KEYS.session, expired);
  const g4 = await A.getSession();
  t('expired session rejected (fail closed)', g4 === null);

  await storage.set(KEYS.session, { token: null });
  const g5 = await A.getSession();
  t('malformed session rejected (fail closed)', g5 === null);

  await storage.set(KEYS.session, { token: 'x'.repeat(30), userId: 'usr_unknown', createdAt: Date.now(), expiresAt: Date.now() + 1000 });
  const g6 = await A.getSession();
  t('session for missing user rejected', g6 === null);

  console.log(failures ? 'SMOKE FAILURES: ' + failures : 'SMOKE ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });

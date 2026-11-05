import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton, Field } from '../components/UI';
import { validateEmail, validatePassword } from '../auth/validate';
import { useAuth } from '../auth/AuthProvider';

export default function Register({ navigation }) {
  const { signUp } = useAuth();
  const [state, setState] = useState({ email: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (key, value) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  };

  const strength = (() => {
    const p = state.password;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[a-zA-Z]/.test(p) && /[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    if (!p) score = -1;
    return score;
  })();

  const submit = async () => {
    const e = {};
    const emailCheck = validateEmail(state.email);
    if (emailCheck.error) e.email = emailCheck.error;
    const passCheck = validatePassword(state.password);
    if (passCheck.error) e.password = passCheck.error;
    if (state.confirm !== state.password) e.confirm = 'Passwords do not match. Re-enter to confirm.';
    if (!state.terms) e.terms = 'Read and accept the Terms and Privacy Policy to continue.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const out = await signUp({ email: emailCheck.email, password: passCheck.password });
      if (out.error) {
        setErrors({ form: out.error });
      }
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'We could not create your account. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title="Create account" onBack={() => navigation.goBack()} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: S.screen }}>
          <Text style={st.lede}>
            Join Tuyamika and be part of a community that celebrates giving, sharing and life's special moments.
          </Text>

          <Field label="Email" placeholder="name@example.com" value={state.email} onChangeText={(t) => setField('email', t)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" style={{ marginTop: 10 }} />

          <Field label="Password" placeholder="8+ characters, letters and numbers" value={state.password} onChangeText={(t) => setField('password', t)} error={errors.password} secure autoComplete="new-password" textContentType="newPassword" style={{ marginTop: 8 }} />

          {state.password.length > 0 && (
            <View style={st.strengthRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[st.strengthSeg, i < strength && { backgroundColor: strength >= 4 ? C.available : strength >= 2 ? C.gold : C.walnut }]} />
              ))}
              <Text style={st.strengthText}>{['', 'Weak', 'Fair', 'Good', 'Strong'][Math.max(0, strength)]}</Text>
            </View>
          )}

          <Field label="Confirm password" placeholder="Re-enter your password" value={state.confirm} onChangeText={(t) => setField('confirm', t)} error={errors.confirm} secure autoComplete="new-password" textContentType="newPassword" style={{ marginTop: 8 }} />

          <Pressable
            style={st.termsRow}
            onPress={() => setField('terms', !state.terms)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: state.terms }}
            accessibilityLabel="Accept the Terms of Service and Privacy Policy"
          >
            <Ionicons name={state.terms ? 'checkbox' : 'square-outline'} size={20} color={C.bronze} />
            <Text style={st.termsText}>
              I agree to the <Text style={st.termsLink}>Terms of Service</Text> and <Text style={st.termsLink}>Privacy Policy</Text>, and I accept communication preferences.
            </Text>
          </Pressable>
          {errors.terms ? <Text style={st.err}>{errors.terms}</Text> : null}

          {errors.form ? (
            <View style={st.formError}>
              <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
              <Text style={st.formErrorTxt}>{errors.form}</Text>
            </View>
          ) : null}

          <PrimaryButton label="Create Account" loading={submitting} disabled={submitting} onPress={submit} style={{ marginTop: 18 }} />

          <View style={st.altRow}>
            <Text style={st.altText}>Already have an account?</Text>
            <Pressable hitSlop={10} onPress={() => navigation.replace('Login')}>
              <Text style={st.altLink}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  lede: { fontFamily: F.body, fontSize: 12.5, color: C.darkwood, lineHeight: 19, marginTop: 6 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 6 },
  strengthSeg: { height: 4, flex: 1, borderRadius: 4, backgroundColor: C.blush, marginRight: 6 },
  strengthText: { fontFamily: F.bodyMid, fontSize: 10, color: C.walnut, marginLeft: 4, width: 46, textAlign: 'right' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14 },
  termsText: { flex: 1, fontFamily: F.body, fontSize: 11, color: C.darkwood, marginLeft: 10, lineHeight: 16 },
  termsLink: { fontFamily: F.bodyBold, color: C.bronze },
  err: { fontFamily: F.body, fontSize: 10.5, color: C.danger, marginTop: 4 },
  formError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8E3DF', borderRadius: 12, padding: 12, marginTop: 12 },
  formErrorTxt: { flex: 1, fontFamily: F.bodyMid, fontSize: 11.5, color: C.danger, marginLeft: 8, lineHeight: 16 },
  altRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  altText: { fontFamily: F.body, fontSize: 12, color: C.walnut },
  altLink: { fontFamily: F.bodyBold, fontSize: 12, color: C.bronze, marginLeft: 6 },
});

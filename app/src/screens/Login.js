import React, { useState } from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { C, F } from '../theme';
import { AuthFrame, FormNotice } from '../components/AuthFrame';
import { Field, PrimaryButton, GhostButton } from '../components/UI';
import { validateEmail } from '../auth/validate';
import { useAuth } from '../auth/AuthProvider';

export default function Login({ navigation }) {
  const { signIn, signInWithGoogle, canGoogleSignIn } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
    setFormError('');
  }

  async function submit() {
    const emailCheck = validateEmail(values.email);
    const nextErrors = {};
    if (emailCheck.error) nextErrors.email = emailCheck.error;
    if (!values.password) nextErrors.password = 'Enter your password to continue.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const result = await signIn({ email: emailCheck.email, password: values.password });
      if (result.error) setFormError(result.error);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not sign you in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame title="Welcome back" onBack={() => navigation.goBack()}>
      <Text style={st.lede}>Sign in to pick up where your celebrations left off.</Text>
      <Field
        label="Email"
        placeholder="name@example.com"
        value={values.email}
        onChangeText={(value) => setField('email', value)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        style={{ marginTop: 22 }}
      />
      <Field
        label="Password"
        placeholder="Your password"
        value={values.password}
        onChangeText={(value) => setField('password', value)}
        error={errors.password}
        secure
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
        style={{ marginTop: 14 }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('PasswordRecovery')}
        hitSlop={8}
        style={st.forgot}
      >
        <Text style={st.link}>Forgot password?</Text>
      </Pressable>

      <FormNotice message={formError} />
      <PrimaryButton
        label="Sign in"
        loading={submitting}
        disabled={submitting}
        onPress={submit}
        style={{ marginTop: 18 }}
      />

      {canGoogleSignIn ? (
        <View style={st.dividerRow}>
          <View style={st.divider} />
          <Text style={st.dividerTxt}>or</Text>
          <View style={st.divider} />
        </View>
      ) : null}
      {canGoogleSignIn ? (
        <GhostButton
          label="Continue with Google"
          icon="logo-google"
          onPress={async () => {
            setFormError('');
            setGoogleSubmitting(true);
            try {
              const result = await signInWithGoogle();
              if (result.error) setFormError(result.error);
            } catch (error) {
              setFormError(error instanceof Error ? error.message : 'We could not sign you in. Please try again.');
            } finally {
              setGoogleSubmitting(false);
            }
          }}
        />
      ) : null}

      <Text style={st.registerPrompt}>
        New to Tuyamika?{' '}
        <Text
          accessibilityRole="link"
          onPress={() => navigation.navigate('Register')}
          style={st.link}
        >
          Create an account
        </Text>
      </Text>
      {__DEV__ ? (
        <Text style={st.devNote}>
          Development accounts are stored on this device only and are not production authentication.
        </Text>
      ) : null}
    </AuthFrame>
  );
}

const st = StyleSheet.create({
  lede: { fontFamily: F.body, fontSize: 12.5, color: C.darkwood, lineHeight: 19, marginTop: 10 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 10 },
  link: { fontFamily: F.bodyBold, fontSize: 12, color: C.bronze },
  registerPrompt: { fontFamily: F.body, fontSize: 12, color: C.walnut, textAlign: 'center', marginTop: 22 },
  devNote: { fontFamily: F.body, fontSize: 10.5, lineHeight: 16, color: C.walnut, textAlign: 'center', marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  divider: { flex: 1, height: 1, backgroundColor: C.champagne },
  dividerTxt: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.walnut, marginHorizontal: 12 },
});

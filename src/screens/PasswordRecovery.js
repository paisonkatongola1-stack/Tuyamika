import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { C, F } from '../theme';
import { AuthFrame, FormNotice } from '../components/AuthFrame';
import { Field, PrimaryButton } from '../components/UI';
import { validateEmail, validatePassword } from '../auth/validate';
import { useAuth } from '../auth/AuthProvider';

export default function PasswordRecovery({ navigation }) {
  const { authMode, requestPasswordReset, resetPassword: resetWithCode } = useAuth();
  const [values, setValues] = useState({ email: '', code: '', password: '', confirm: '' });
  const [requested, setRequested] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [devCode, setDevCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
    setFormError('');
    setNotice('');
  }

  async function requestCode() {
    const emailCheck = validateEmail(values.email);
    if (emailCheck.error) {
      setErrors({ email: emailCheck.error });
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const result = await requestPasswordReset(emailCheck.email);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setRequested(true);
      setNotice(result.note || 'If an account exists for that email, a reset code is on its way.');
      setDevCode(result.devCode || '');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not request a reset code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    const nextErrors = {};
    if (!/^\d{6}$/.test(values.code)) nextErrors.code = 'Enter the six-digit reset code.';
    const passwordCheck = validatePassword(values.password);
    if (passwordCheck.error) nextErrors.password = passwordCheck.error;
    if (values.confirm !== values.password) nextErrors.confirm = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const emailCheck = validateEmail(values.email);
    if (emailCheck.error) {
      setErrors((current) => ({ ...current, email: emailCheck.error }));
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const result = await resetWithCode({
        email: emailCheck.email,
        code: values.code,
        password: passwordCheck.password,
      });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      navigation.replace('Login');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not reset your password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame title="Reset password" onBack={() => navigation.goBack()}>
      <Text style={st.lede}>
        Enter the email linked to your account. We will send instructions to reset your password.
      </Text>
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
        editable={!requested}
        style={{ marginTop: 22 }}
      />
      {!requested ? (
        <PrimaryButton
          label="Send reset instructions"
          loading={submitting}
          disabled={submitting}
          onPress={requestCode}
          style={{ marginTop: 18 }}
        />
      ) : (
        <>
          <FormNotice message={notice} type="info" />
          {devCode ? (
            <FormNotice
              message={`Development-only reset code: ${devCode}. No email was sent.`}
              type="info"
            />
          ) : null}
          <Field
            label="Six-digit reset code"
            placeholder="000000"
            value={values.code}
            onChangeText={(value) => setField('code', value.replace(/\D/g, '').slice(0, 6))}
            error={errors.code}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={{ marginTop: 18 }}
          />
          <Field
            label="New password"
            placeholder="8+ characters, letters and numbers"
            value={values.password}
            onChangeText={(value) => setField('password', value)}
            error={errors.password}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            style={{ marginTop: 14 }}
          />
          <Field
            label="Confirm new password"
            placeholder="Re-enter your new password"
            value={values.confirm}
            onChangeText={(value) => setField('confirm', value)}
            error={errors.confirm}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={resetPassword}
            style={{ marginTop: 14 }}
          />
          <PrimaryButton
            label="Save new password"
            loading={submitting}
            disabled={submitting}
            onPress={resetPassword}
            style={{ marginTop: 18 }}
          />
        </>
      )}
      <FormNotice message={formError} />
      {authMode === 'local-development' ? (
        <Text style={st.devNote}>Development-only recovery. Production reset delivery must be handled by the configured auth provider.</Text>
      ) : null}
    </AuthFrame>
  );
}

const st = StyleSheet.create({
  lede: { fontFamily: F.body, fontSize: 12.5, color: C.darkwood, lineHeight: 19, marginTop: 10 },
  devNote: { fontFamily: F.body, fontSize: 10.5, color: C.walnut, lineHeight: 16, marginTop: 18 },
});

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, F } from '../theme';
import { AuthFrame, FormNotice } from '../components/AuthFrame';
import { Field, PrimaryButton } from '../components/UI';
import { COUNTRIES, validateBirthday, validateName, validatePhone } from '../auth/validate';
import { useAuth } from '../auth/AuthProvider';

export default function ProfileSetup({ navigation }) {
  const { user, updateProfile } = useAuth();
  const [values, setValues] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    birthday: user?.birthday || '',
    country: user?.country || 'ZM',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
    setFormError('');
  }

  async function submit() {
    const nameCheck = validateName(values.fullName);
    const phoneCheck = values.phone.trim() ? validatePhone(values.phone, values.country) : { phone: '' };
    const birthdayCheck = validateBirthday(values.birthday);
    const nextErrors = {};
    if (nameCheck.error) nextErrors.fullName = nameCheck.error;
    if (phoneCheck.error) nextErrors.phone = phoneCheck.error;
    if (birthdayCheck.error) nextErrors.birthday = birthdayCheck.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const country = COUNTRIES.find((item) => item.code === values.country);
    if (!country) {
      setFormError('Choose Zambia or Zimbabwe to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateProfile({
        fullName: nameCheck.name,
        phone: phoneCheck.phone,
        birthday: birthdayCheck.birthday,
        country: country.code,
        currency: country.currency,
      });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      navigation.navigate('GiftPreferences');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not save your profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame title="Your profile">
      <Text style={st.title}>Make it yours</Text>
      <Text style={st.lede}>A few details help us make your gifting experience feel personal.</Text>
      <Text style={st.accountEmail}>{user?.email}</Text>

      <Field
        label="Your name"
        placeholder="Full name"
        value={values.fullName}
        onChangeText={(value) => setField('fullName', value)}
        error={errors.fullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        style={{ marginTop: 18 }}
      />

      <Text style={st.label}>Country</Text>
      <View style={st.countryRow} accessibilityRole="radiogroup" accessibilityLabel="Choose your country">
        {COUNTRIES.map((country) => {
          const selected = values.country === country.code;
          return (
            <Pressable
              key={country.code}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={country.name}
              onPress={() => setField('country', country.code)}
              style={[st.countryOption, selected && st.countrySelected]}
            >
              <Text style={[st.countryText, selected && st.countryTextSelected]}>{country.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field
        label="Phone number (optional)"
        placeholder={values.country === 'ZM' ? '097 123 4567' : '077 123 4567'}
        value={values.phone}
        onChangeText={(value) => setField('phone', value)}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        style={{ marginTop: 16 }}
      />
      <Field
        label="Birthday (optional)"
        placeholder="YYYY-MM-DD"
        value={values.birthday}
        onChangeText={(value) => setField('birthday', value)}
        error={errors.birthday}
        autoComplete="off"
        maxLength={10}
        style={{ marginTop: 14 }}
      />

      <FormNotice message={formError} />
      <PrimaryButton
        label="Continue"
        loading={submitting}
        disabled={submitting}
        onPress={submit}
        style={{ marginTop: 20 }}
      />
    </AuthFrame>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: F.displayMid, fontSize: 24, color: C.espresso, marginTop: 18 },
  lede: { fontFamily: F.body, fontSize: 12.5, color: C.darkwood, lineHeight: 19, marginTop: 2 },
  accountEmail: { fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginTop: 12 },
  label: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.espresso, marginTop: 18, marginBottom: 7 },
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countryOption: { borderWidth: 1, borderColor: C.champagne, backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13 },
  countrySelected: { backgroundColor: C.espresso, borderColor: C.espresso },
  countryText: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.espresso },
  countryTextSelected: { color: C.ivory },
});

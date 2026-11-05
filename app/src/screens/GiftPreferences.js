import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F } from '../theme';
import { AuthFrame, FormNotice } from '../components/AuthFrame';
import { PrimaryButton } from '../components/UI';
import { GIFT_CATEGORIES } from '../auth/validate';
import { useAuth } from '../auth/AuthProvider';

export default function GiftPreferences({ navigation }) {
  const { user, updateProfile } = useAuth();
  const [selected, setSelected] = useState(user?.giftPreferences || []);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function togglePreference(category) {
    setSelected((current) => (
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    ));
    setFormError('');
  }

  async function submit() {
    if (!selected.length) {
      setFormError('Choose at least one category to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateProfile({
        giftPreferences: selected,
        onboardingComplete: true,
      });
      if (result.error) {
        setFormError(result.error);
        return;
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not save your preferences.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame title="Gift preferences" onBack={() => navigation.goBack()}>
      <Text style={st.title}>What do you love?</Text>
      <Text style={st.lede}>Choose a few categories to personalise the gifts and ideas we show you. You can change these later.</Text>

      <View style={st.list}>
        {GIFT_CATEGORIES.map((category) => {
          const checked = selected.includes(category);
          return (
            <Pressable
              key={category}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => togglePreference(category)}
              style={[st.option, checked && st.optionChecked]}
            >
              <View style={[st.check, checked && st.checkChecked]}>
                {checked ? <Ionicons name="checkmark" size={14} color={C.white} /> : null}
              </View>
              <Text style={[st.optionText, checked && st.optionTextChecked]}>{category}</Text>
            </Pressable>
          );
        })}
      </View>

      <FormNotice message={formError} />
      <PrimaryButton
        label="Finish setup"
        loading={submitting}
        disabled={submitting}
        onPress={submit}
        style={{ marginTop: 18 }}
      />
    </AuthFrame>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: F.displayMid, fontSize: 24, color: C.espresso, marginTop: 18 },
  lede: { fontFamily: F.body, fontSize: 12.5, color: C.darkwood, lineHeight: 19, marginTop: 2 },
  list: { marginTop: 18 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: C.champagne, backgroundColor: C.white, marginBottom: 8 },
  optionChecked: { borderColor: C.gold, backgroundColor: '#F2E9DC' },
  check: { width: 21, height: 21, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.walnut, marginRight: 11 },
  checkChecked: { borderColor: C.gold, backgroundColor: C.gold },
  optionText: { flex: 1, fontFamily: F.bodyMid, fontSize: 12, color: C.espresso },
  optionTextChecked: { fontFamily: F.bodyBold },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S } from '../theme';
import { TopHeader } from './Headers';
import { Wordmark } from './Logo';

export function AuthFrame({ title, onBack, children }) {
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.fill}>
        <TopHeader title={title} onBack={onBack} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scroll}
        >
          <View style={st.content}>
            <Wordmark size={21} color={C.espresso} />
            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function FormNotice({ message, type = 'error' }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <View
      style={[st.notice, isError ? st.errorNotice : st.infoNotice]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={isError ? 'alert-circle-outline' : 'information-circle-outline'}
        size={17}
        color={isError ? C.danger : C.darkwood}
      />
      <Text style={[st.noticeText, isError ? st.errorText : st.infoText]}>{message}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ivory },
  fill: { flex: 1, backgroundColor: C.ivory },
  scroll: { flexGrow: 1, paddingHorizontal: S.screen, paddingTop: 16, paddingBottom: 36 },
  content: { width: '100%', maxWidth: 540, alignSelf: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 12, marginTop: 14 },
  errorNotice: { backgroundColor: '#F8E3DF' },
  infoNotice: { backgroundColor: '#EFE6D9' },
  noticeText: { flex: 1, fontFamily: F.bodyMid, fontSize: 11.5, lineHeight: 17, marginLeft: 8 },
  errorText: { color: C.danger },
  infoText: { color: C.darkwood },
});

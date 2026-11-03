import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton, GhostButton } from '../components/UI';
import { Wordmark } from '../components/Logo';
import { useStore } from '../store';
import { PRODUCTS } from '../data';

export default function ShareRegistry({ route, navigation }) {
  const title = route.params?.title || 'Your registry';
  const { registries } = useStore();
  const reg = registries[registries.length - 1] || {};
  const link = `https://tuyamika.co.zm/r/${reg.shareToken || 'TUYA-?'}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title="Share" onBack={() => navigation.popToTop()} />
        <ScrollView contentContainerStyle={{ alignItems: 'center', padding: S.screen, paddingBottom: 40 }}>
          <LinearGradient colors={[C.blush, C.champagne]} style={[st.qr, shadow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={[st.qrCard, shadow]}>
              <View style={st.qrGrid}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <View key={i} style={[st.qrDot, ((i * 7 + 3) % 4) < 2 && { backgroundColor: C.espresso }]} />
                ))}
              </View>
            </View>
            <Text style={st.qrCaption}>Scan to view “{title}”</Text>
          </LinearGradient>

          <View style={[st.linkBox, shadow]}>
            <Text style={st.linkLabel}>Registry link</Text>
            <Text style={st.linkTxt} selectable>{link}</Text>
          </View>

          <View style={st.btnRow}>
            <GhostButton label="Copy link" icon="copy-outline" onPress={() => {}} />
            <GhostButton label="WhatsApp" icon="logo-whatsapp" onPress={() => {}} />
          </View>
          <View style={st.btnRow}>
            <GhostButton label="Instagram" icon="logo-instagram" onPress={() => {}} />
            <GhostButton label="Email" icon="mail-outline" onPress={() => {}} />
          </View>

          <PrimaryButton label="Done" style={{ alignSelf: 'stretch', marginTop: 16 }} onPress={() => navigation.popToTop()} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  qr: { borderRadius: 22, padding: 20, alignItems: 'center', marginTop: 10, width: 300 },
  qrCard: { backgroundColor: C.ivory, padding: 14, borderRadius: 14 },
  qrGrid: { width: 140, flexDirection: 'row', flexWrap: 'wrap' },
  qrDot: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.blush, margin: 1 },
  qrCaption: { fontFamily: F.bodyBold, fontSize: 12, color: C.espresso, marginTop: 14 },
  linkBox: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginTop: 16, alignSelf: 'stretch', borderWidth: 1, borderColor: C.blush },
  linkLabel: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.walnut },
  linkTxt: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso, marginTop: 4, lineHeight: 19 },
  btnRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 12, alignItems: 'center' },
});

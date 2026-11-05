import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { SunSpiral, Wordmark } from '../components/Logo';
import { PrimaryButton, GhostButton } from '../components/UI';
import { useAuth } from '../auth/AuthProvider';

export default function Welcome({ navigation }) {
  const { enterGuestMode, authMode } = useAuth();

  return (
    <LinearGradient colors={[C.blush, C.champagne, C.blush]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <View style={st.deco}>
            <SunSpiral size={52} color={C.walnut} />
            <SunSpiral size={34} color={C.honey} />
          </View>

          <View style={st.brandBox}>
            <Wordmark size={42} color={C.espresso} tagline tagColor={C.darkwood} />
          </View>

          <View style={st.ornament}>
            <View style={[st.dash, { marginRight: 9 }]} />
            <View style={st.dia} />
            <View style={[st.dash, { marginLeft: 9 }]} />
          </View>

          <Text style={st.pitch}>
            Gifts, celebrations and connections — registries, group gifting and events, all in one place.
          </Text>

          <View style={st.explainRow}>
            <View style={st.explainIcon}><Ionicons name="albums-outline" size={19} color={C.darkwood} /></View>
            <Text style={st.explainText}>Create a registry, share it by link or QR, guests reserve without duplicates.</Text>
          </View>
          <View style={st.explainRow}>
            <View style={st.explainIcon}><Ionicons name="people-outline" size={19} color={C.darkwood} /></View>
            <Text style={st.explainText}>Pool contributions together. Progress updates live, amounts stay private.</Text>
          </View>
          <View style={st.explainRow}>
            <View style={st.explainIcon}><Ionicons name="calendar-outline" size={19} color={C.darkwood} /></View>
            <Text style={st.explainText}>Plan events with your committee, discover suppliers, track every delivery.</Text>
          </View>

          <View style={st.ctaBox}>
            <PrimaryButton label="Create an account" onPress={() => navigation.navigate('Register')} icon="person-add-outline" />
            <GhostButton label="Sign in" style={{ marginTop: 10, borderColor: C.walnut }} onPress={() => navigation.navigate('Login')} />
            <Pressable onPress={() => { void enterGuestMode(); }} hitSlop={8} style={st.guestLink}>
              <Text style={st.guestText}>Not yet — explore as a guest</Text>
            </Pressable>
            {authMode === 'local-development' ? (
              <Text style={st.authNote}>Development accounts stay on this device. Configure a production auth provider before release.</Text>
            ) : authMode === 'unconfigured' ? (
              <Text style={st.authNote}>Account services are not configured yet. You can still explore as a guest.</Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: S.screen, paddingBottom: 34 },
  deco: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
  brandBox: { alignItems: 'center', marginTop: 18 },
  ornament: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 18 },
  dash: { height: 2, width: 46, backgroundColor: C.walnut, borderRadius: 2 },
  dia: { width: 9, height: 9, borderRadius: 3, backgroundColor: C.walnut, transform: [{ rotate: '45deg' }] },
  pitch: { fontFamily: F.bodyMid, fontSize: 13.5, color: C.espresso, textAlign: 'center', lineHeight: 20, marginTop: 20 },
  explainRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, alignItems: 'center' },
  explainIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  explainText: { flex: 1, fontFamily: F.body, fontSize: 12, color: C.darkwood, marginLeft: 12, lineHeight: 17 },
  ctaBox: { marginTop: 'auto', paddingTop: 24 },
  guestLink: { alignSelf: 'center', marginTop: 16, padding: 8 },
  guestText: { fontFamily: F.bodyMid, fontSize: 12.5, color: C.darkwood, textDecorationLine: 'underline' },
  authNote: { fontFamily: F.body, fontSize: 10, color: C.darkwood, textAlign: 'center', lineHeight: 15, marginTop: 9 },
});

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../theme';
import { SunSpiral, Wordmark } from '../components/Logo';

export default function Splash() {
  return (
    <LinearGradient colors={[C.blush, C.champagne, C.blush]} style={st.fill}>
      <SafeAreaView style={st.fill}>
        <View style={st.body}>
          <SunSpiral size={92} color={C.darkwood} />
          <Wordmark size={44} color={C.espresso} />
          <Text style={st.tag}>The Beauty of Giving, The Joy of Sharing.</Text>
          <View style={st.rule}><View style={st.dash} /><View style={st.dot} /><View style={st.dash} /></View>
        </View>
        <Text style={st.foot}>Gifts · Celebrations · Connections</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tag: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.darkwood, marginTop: 10 },
  rule: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  dash: { height: 2, width: 52, backgroundColor: C.walnut, borderRadius: 2 },
  dot: { width: 9, height: 9, borderRadius: 3, backgroundColor: C.walnut, transform: [{ rotate: '45deg' }], marginHorizontal: 10 },
  foot: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.darkwood, textAlign: 'center', paddingBottom: 34, letterSpacing: 0.5 },
});

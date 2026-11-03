import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { PrimaryButton } from '../components/UI';
import { useStore } from '../store';
import { PRODUCTS } from '../data';

const find = (id) => PRODUCTS.find((p) => p.id === id);

export default function Registries({ navigation }) {
  const { registries, campaigns } = useStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <View style={{ paddingHorizontal: S.screen, paddingTop: 14 }}>
            <Text style={st.h1}>Registries</Text>
            <View style={st.topTabs}>
              <Text style={[st.topTab, st.topTabOn]}>My Registries</Text>
              <Text style={st.topTab}>Browse Gifts</Text>
              <Text style={st.topTab}>Group Gifting</Text>
            </View>
          </View>

          {registries.map((r) => {
            const all = r.items.reduce((n, it) => n + it.slots.length, 0);
            const taken = r.items.reduce((n, it) => n + it.slots.filter((s) => s !== 'available').length, 0);
            return (
              <View key={r.id} style={[st.card, shadow]}>
                <LinearGradient colors={[r.coverA, r.coverB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cover}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.cardTitle}>{r.title}</Text>
                    <Text style={st.cardMeta}>
                      <Ionicons name="sparkles-outline" size={10} color={C.espresso} /> {r.occasion} · {r.date}
                    </Text>
                    <Text style={st.cardMeta}>
                      <Ionicons name="pulse-outline" size={10} color={C.espresso} /> {all - taken} of {all} still needed
                    </Text>
                  </View>
                  <PrimaryButton label="View" small onPress={() => navigation.navigate('RegistryDetail', { id: r.id })} />
                </LinearGradient>
              </View>
            );
          })}

          <View style={{ paddingHorizontal: S.screen, marginTop: 6 }}>
            <PrimaryButton label="Create New Registry" icon="add" onPress={() => navigation.navigate('RegistryCreate')} />
          </View>

          <View style={{ paddingHorizontal: S.screen, marginTop: 22 }}>
            <Text style={st.h2}>Group Campaigns</Text>
            {campaigns.map((c) => {
              const pct = Math.round((c.raised / c.target) * 100);
              return (
                <Pressable key={c.id} onPress={() => navigation.navigate('GroupGifting')} style={[st.camp, shadow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.campTitle}>{c.title}</Text>
                    <Text style={st.campMeta}>{new Date(c.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} deadline</Text>
                    <View style={st.barWrap}><View style={[st.bar, { width: `${pct}%` }]} /></View>
                    <Text style={st.campAmount}>K{c.raised.toLocaleString('en-ZM')} <Text style={{ fontFamily: F.body, color: C.walnut }}>raised · {pct}%</Text></Text>
                  </View>
                  <View style={st.pct}><Text style={st.pctTxt}>{pct}%</Text></View>
                </Pressable>
              );
            })}
            <PrimaryButton label="Create Group Contribution" icon="people" tint="ghost" onPress={() => navigation.navigate('GroupGifting')} style={{ marginTop: 4 }} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 24, color: C.espresso },
  h2: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.espresso, marginBottom: 12 },
  topTabs: { flexDirection: 'row', marginTop: 12, marginBottom: 14 },
  topTab: { fontFamily: F.bodyBold, fontSize: 13, color: C.walnut, marginRight: 18 },
  topTabOn: { color: C.espresso, textDecorationLine: 'underline' },
  card: { borderRadius: 16, marginHorizontal: S.screen, marginBottom: 14, overflow: 'hidden' },
  cover: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontFamily: F.bodyBold, fontSize: 16, color: C.espresso },
  cardMeta: { fontFamily: F.bodyMid, fontSize: 11, color: C.espresso, marginTop: 4 },
  camp: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  campTitle: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.espresso },
  campMeta: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.walnut, marginTop: 2 },
  campAmount: { fontFamily: F.bodyBold, fontSize: 12, color: C.espresso, marginTop: 6 },
  barWrap: { height: 6, backgroundColor: C.blush, borderRadius: 6, marginTop: 8, overflow: 'hidden' },
  bar: { height: 6, backgroundColor: C.gold, borderRadius: 6 },
  pct: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  pctTxt: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.espresso },
});

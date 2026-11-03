import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from  '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton, ProgressBar } from '../components/UI';
import { useStore } from '../store';

const pct = (c) => (c.target ? Math.round((c.raised / c.target) * 100) : 0);

export default function GroupGifting({ route, navigation }) {
  const { campaigns, money } = useStore();
  const id = route.params?.id || campaigns[0]?.id;
  const c = campaigns.find((x) => x.id === id);

  if (!c) return null;
  const days = Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / 86400000));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <TopHeader title="Group Contributions" onBack={() => navigation.goBack()} />

          <View style={{ paddingHorizontal: S.screen, marginTop: 4 }}>
            <LinearGradient colors={[c.a, c.b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, shadow]}>
              <Text style={st.eyebrow}>GROUP CONTRIBUTION · {c.purpose.toUpperCase()}</Text>
              <Text style={st.title}>{c.title}</Text>
              <Text style={st.deadlineMeta}>
                <Ionicons name="hourglass-outline" size={10} color={C.espresso} /> {days} days to go
              </Text>
              <View style={{ marginTop: 12 }}>
                <ProgressBar pct={pct(c)} h={8} />
              </View>
              <View style={st.heroPct}>
                <Text style={st.pctTxt}>{pct(c)}%</Text>
              </View>
            </LinearGradient>

            <View style={st.raisedCard}>
              <Text style={st.raisedBig}>{money(c.raised)}</Text>
              <Text style={st.raisedSub}>raised of {money(c.target)}</Text>
            </View>

            {c.goals.length ? (
              <>
                <Text style={st.sectionTitle}>Progress by goal</Text>
                {c.goals.map((g) => (
                  <View key={g.id} style={[st.goal, shadow]}>
                    <Text style={st.goalTitle}>{g.title}</Text>
                    <ProgressBar pct={(g.raised / g.target) * 100} h={6} />
                    <Text style={st.goalMeta}>{money(g.raised)} of {money(g.target)}</Text>
                  </View>
                ))}
              </>
            ) : null}

            <Text style={st.sectionTitle}>Recent Contributions</Text>
            {(c.contributions || []).map((ct) => (
              <View key={ct.id} style={[st.cRow, shadow]}>
                <View style={st.avatar}><Text style={st.avatarTxt}>{ct.name.slice(0, 1)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.cName}>{ct.name}</Text>
                  <Text style={st.cDate}>{new Date(ct.date).toLocaleDateString('en-GB')} · {ct.status}</Text>
                </View>
                <Text style={st.cAmount}>{money(ct.amount)}</Text>
              </View>
            ))}
            <View style={[st.cRow, shadow]}>
              <Ionicons name="lock-closed-outline" size={19} color={C.walnut} />
              <Text style={{ fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginLeft: 12 }}>
                Contributor amounts are private. Only authorised organisers see full records.
              </Text>
            </View>

            <PrimaryButton label="Contribute" style={{ marginTop: 18, marginBottom: 20 }} onPress={() => navigation.navigate('Payment', { contribution: { campaign: c.title, campaignId: c.id, amount: 500 } })} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: 18, padding: 16 },
  eyebrow: { fontFamily: F.bodyBold, fontSize: 9, letterSpacing: 1.2, color: C.darkwood },
  title: { fontFamily: F.bodyBold, fontSize: 19, color: C.espresso, marginTop: 3 },
  deadlineMeta: { fontFamily: F.bodyMid, fontSize: 11, color: C.espresso, marginTop: 5 },
  heroPct: { position: 'absolute', top: 14, right: 14, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  pctTxt: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso },
  raisedCard: { backgroundColor: C.espresso, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 12 },
  raisedBig: { fontFamily: F.bodyBold, fontSize: 21, color: C.white },
  raisedSub: { fontFamily: F.body, fontSize: 11, color: C.champagne, marginTop: 2 },
  sectionTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.espresso, marginTop: 20, marginBottom: 10 },
  goal: { backgroundColor: C.white, borderRadius: 13, padding: 13, marginBottom: 9 },
  goalTitle: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso, marginBottom: 7 },
  goalMeta: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.walnut, marginTop: 5 },
  cRow: { backgroundColor: C.white, borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: F.bodyBold, fontSize: 13, color: C.darkwood },
  cName: { fontFamily: F.bodyBold, fontSize: 12, color: C.espresso, marginLeft: 11 },
  cDate: { fontFamily: F.body, fontSize: 9.5, color: C.walnut, marginTop: 1 },
  cAmount: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton } from '../components/UI';
import { useStore } from '../store';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'committee', label: 'Committee', icon: 'people-outline' },
  { id: 'rsvps', label: 'RSVPs', icon: 'mail-outline' },
  { id: 'budget', label: 'Budget', icon: 'wallet-outline' },
  { id: 'tasks', label: 'Tasks', icon: 'checkbox-outline' },
  { id: 'suppliers', label: 'Suppliers', icon: 'storefront-outline' },
];

export default function EventDetail({ route, navigation }) {
  const { events, money, campaigns } = useStore();
  const e = events.find((x) => x.id === route.params?.id);

  if (!e) return null;
  const days = Math.max(0, Math.ceil((new Date(e.date) - new Date()) / 86400000));
  const camp = campaigns[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <LinearGradient colors={[e.a, e.b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.grad}>
            <TopHeader title={e.name} onBack={() => navigation.goBack()} transparent />
            <View style={{ paddingHorizontal: S.screen }}>
              <Text style={st.name}>{e.name}</Text>
              <Text style={st.meta}><Ionicons name="calendar-outline" size={11} color={C.espresso} /> {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {e.time}</Text>
              <Text style={st.meta}><Ionicons name="location-outline" size={11} color={C.espresso} /> {e.venue}</Text>
            </View>
          </LinearGradient>

          <View style={st.row4}>
            <Stat icon="people-outline" v={e.guests} l="Guests" />
            <Stat icon="list-outline" v={e.tasks.length} l="Tasks" />
            <Stat icon="wallet-outline" v={money(e.budget)} l="Budget" />
            <Stat icon="hourglass-outline" v={days} l="Days" />
          </View>

          <View style={{ paddingHorizontal: S.screen }}>
            {SECTIONS.map((s) => (
              <Pressable key={s.id} style={[st.row, shadow]}>
                <View style={st.icon}><Ionicons name={s.icon} size={17} color={C.darkwood} /></View>
                <Text style={st.rowLabel}>{s.label}</Text>
                <Text style={st.rowRight}>{summarise(s.id, { e, money, camp })}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.walnut} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const summarise = (id, { e, money, camp }) => {
  switch (id) {
    case 'overview': return 'Details & activity';
    case 'committee': return `${e.committee.length} members`;
    case 'rsvps': return `${e.guests} responses`;
    case 'budget': return `${money(e.budget)}`;
    case 'tasks': return `${e.tasks.length} open`;
    case 'suppliers': return 'Request quotes';
    default: return '';
  }
};

function Stat({ icon, v, l }) {
  return (
    <View style={[st.stat, shadow]}>
      <Ionicons name={icon} size={17} color={C.bronze} />
      <Text style={st.statV} numberOfLines={1}>{v}</Text>
      <Text style={st.statL}>{l}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  grad: { paddingBottom: 16 },
  name: { fontFamily: F.bodyBold, fontSize: 21, color: C.espresso, marginTop: 2 },
  meta: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.espresso, marginTop: 4 },
  row4: { flexDirection: 'row', paddingHorizontal: S.screen, marginTop: 14 },
  stat: { flex: 1, backgroundColor: C.white, borderRadius: 13, padding: 11, alignItems: 'center', marginHorizontal: 4, overflow: 'hidden' },
  statV: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso, marginTop: 4 },
  statL: { fontFamily: F.body, fontSize: 9, color: C.walnut },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, padding: 13, marginBottom: 9 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso, marginLeft: 12, flex: 1 },
  rowRight: { fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginRight: 6 },
});

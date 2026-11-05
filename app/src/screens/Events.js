import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { PrimaryButton } from '../components/UI';
import { useStore } from '../store';

export default function Events({ navigation }) {
  const { events, money } = useStore();
  const upcoming = events.filter((e) => e.status === 'upcoming');
  const past = events.filter((e) => e.status !== 'upcoming');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <View style={{ paddingHorizontal: S.screen, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={st.h1}>Events</Text>
            <Pressable onPress={() => navigation.navigate('RegistryCreate')}><Text style={st.link}>+ New Event</Text></Pressable>
          </View>

          <View style={st.tabs}>
            <Text style={[st.tab, st.tabOn]}>Upcoming</Text>
            <Text style={st.tab}>Past</Text>
          </View>

          <View style={{ paddingHorizontal: S.screen }}>
            {upcoming.map((e) => {
              const d = Math.max(0, Math.ceil((new Date(e.date) - new Date()) / 86400000));
              return (
                <Pressable key={e.id} onPress={() => navigation.navigate('EventDetail', { id: e.id })} style={[st.card, shadow]}>
                  <LinearGradient colors={[e.a, e.b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.grad}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.date}>{new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short' })} · {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                      <Text style={st.name}>{e.name}</Text>
                      <Text style={st.meta}><Ionicons name="time-outline" size={11} color={C.espresso} /> {e.time}</Text>
                      <Text style={st.meta}><Ionicons name="location-outline" size={11} color={C.espresso} /> {e.venue}</Text>
                      <Text style={st.meta}><Ionicons name="people-outline" size={11} color={C.espresso} /> {e.guests} guests{e.guests ? '' : ''} · Budget {money(e.budget)}</Text>
                    </View>
                    <View style={st.count}><Text style={st.countNum}>{d}</Text><Text style={st.countLbl}>days</Text></View>
                  </LinearGradient>
                </Pressable>
              );
            })}

            {past.length ? (
              <>
                <Text style={st.h2}>Past</Text>
                {past.map((e) => (
                  <View key={e.id} style={[st.card, shadow, { opacity: 0.8 }]}>
                    <LinearGradient colors={[e.a, e.b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.grad}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.name}>{e.name}</Text>
                        <Text style={st.meta}>{e.date} · {e.venue}</Text>
                      </View>
                      <View style={st.count}><Text style={st.countNum}>✓</Text></View>
                    </LinearGradient>
                  </View>
                ))}
              </>
            ) : null}

            <PrimaryButton label="Create Event" icon="add" style={{ marginTop: 18 }} onPress={() => navigation.navigate('EventDetail', { id: events[0].id })} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 24, color: C.espresso },
  h2: { fontFamily: F.bodyBold, fontSize: 14, color: C.espresso, marginTop: 20, marginBottom: 10 },
  link: { fontFamily: F.bodyBold, fontSize: 12, color: C.bronze },
  tabs: { flexDirection: 'row', paddingHorizontal: S.screen, marginTop: 12, marginBottom: 12 },
  tab: { fontFamily: F.bodyBold, fontSize: 13, color: C.walnut, marginRight: 16 },
  tabOn: { color: C.espresso, borderBottomWidth: 2, borderBottomColor: C.gold },
  card: { borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  grad: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  date: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.darkwood },
  name: { fontFamily: F.bodyBold, fontSize: 17, color: C.espresso, marginTop: 2 },
  meta: { fontFamily: F.bodyMid, fontSize: 11, color: C.espresso, marginTop: 3 },
  count: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  countNum: { fontFamily: F.bodyBold, fontSize: 17, color: C.espresso },
  countLbl: { fontFamily: F.body, fontSize: 8.5, color: C.walnut },
});

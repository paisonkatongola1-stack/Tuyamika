import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { Wordmark, SunSpiral } from '../components/Logo';
import { useStore, useActions } from '../store';

export default function Profile({ navigation }) {
  const { user, orders, registries, events, notifications, money, markNotifsRead } = useStore();

  const unread = notifications.filter((n) => n.unread);

  const rows = [
    ['person-outline', 'My Orders', 'Profile', { orderCount: orders.length }],
    ['albums-outline', 'My Registries', 'Registries', { extra: registries.length }],
    ['calendar-outline', 'My Events', 'Events', { extra: events.length }],
    ['document-text-outline', 'Addresses', 'Profile', {}],
    ['card-outline', 'Payment Methods', 'Profile', {}],
    ['notifications-outline', 'Notifications', 'Profile', { extra: unread.length }],
    ['settings-outline', 'Settings', 'Profile', {}],
    ['help-bubble-outline', 'Help & Support', 'Profile', {}],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <LinearGradient colors={[C.blush, C.champagne]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={st.hero}>
            <View style={st.topBar}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={10}><Ionicons name="chevron-back" size={22} color={C.espresso} /></Pressable>
              <Text style={st.heroTitle}>My Account</Text>
              <Pressable hitSlop={10}><Ionicons name="settings-outline" size={21} color={C.espresso} /></Pressable>
            </View>
            <View style={st.userRow}>
              <View style={st.avatarWrap}>
                <SunSpiral size={40} color={C.darkwood} />
              </View>
              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={st.userName}>{user ? user.fullName : 'Bernice Mombela'}</Text>
                <Text style={st.userSub}>{user ? user.email : 'tuyamika.user@gmail.com'}</Text>
                <Text style={st.userSub}>Lusaka, Zambia</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: S.screen, marginTop: -18 }}>
            <View style={[st.stats, shadow]}>
              <Stat v={String(orders.length)} l="Orders" />
              <Stat v={String(registries.length)} l="Registries" />
              <Stat v={String(events.length)} l="Events" />
            </View>
          </View>

          <View style={{ paddingHorizontal: S.screen, marginTop: 16 }}>
            {rows.map(([icon, label, target, meta]) => (
              <Pressable key={label} style={[st.row, shadow]} onPress={() => navigation.navigate(target)}>
                <View style={st.icon}><Ionicons name={icon} size={17} color={C.darkwood} /></View>
                <Text style={st.rowLabel}>{label}</Text>
                {meta.orderCount ? <Text style={st.rowRight}>{meta.orderCount}</Text> : null}
                {meta.extra ? <Text style={st.rowRight}>{meta.extra}</Text> : null}
                <Ionicons name="chevron-forward" size={15} color={C.walnut} />
              </Pressable>
            ))}

            <Pressable style={[st.notifs, shadow]} onPress={markNotifsRead}>
              <Text style={st.h3}>Notifications</Text>
              {notifications.map((n) => (
                <View key={n.id} style={st.notifRow}>
                  <Ionicons name={n.icon} size={16} color={n.unread ? C.bronze : C.walnut} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[st.notifTitle, !n.unread && { color: C.walnut, fontFamily: F.bodyMid }]}>{n.title}</Text>
                    <Text style={st.notifBody} numberOfLines={1}>{n.body}</Text>
                  </View>
                  {n.unread ? <View style={st.notifDot} /> : null}
                </View>
              ))}
              <Text style={st.notifHint}>Tap to mark all read. Surprise-protected messages never reveal gifts.</Text>
            </Pressable>

            <Pressable style={[st.signOut, shadow]} onPress={() => {}}>
              <Ionicons name="log-out-outline" size={17} color={C.danger} />
              <Text style={st.signOutTxt}>Sign Out</Text>
            </Pressable>

            <Wordmark size={15} color={C.walnut} />
            <Text style={st.version}>Tuyamika v1.0 · The Beauty of Giving, The Joy of Sharing.</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Stat({ v, l }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={st.statV}>{v}</Text>
      <Text style={st.statL}>{l}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { paddingBottom: 30 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingTop: 10 },
  heroTitle: { fontFamily: F.bodyBold, fontSize: 15, color: C.espresso },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.screen, marginTop: 14 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },
  userName: { fontFamily: F.bodyBold, fontSize: 17, color: C.espresso },
  userSub: { fontFamily: F.body, fontSize: 10.5, color: C.darkwood, marginTop: 1 },
  stats: { backgroundColor: C.white, borderRadius: 15, paddingVertical: 13, flexDirection: 'row' },
  statV: { fontFamily: F.bodyBold, fontSize: 16, color: C.espresso },
  statL: { fontFamily: F.body, fontSize: 9.5, color: C.walnut, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 13, padding: 12, marginBottom: 8 },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: F.bodyMid, fontSize: 12.5, color: C.espresso, marginLeft: 11, flex: 1 },
  rowRight: { fontFamily: F.bodyBold, fontSize: 11, color: C.bronze, marginRight: 6 },
  notifs: { backgroundColor: C.white, borderRadius: 15, padding: 14, marginTop: 6 },
  h3: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.espresso, marginBottom: 8 },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  notifTitle: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.espresso },
  notifBody: { fontFamily: F.body, fontSize: 10, color: C.walnut, marginTop: 1 },
  notifDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.bronze },
  notifHint: { fontFamily: F.body, fontSize: 9.5, color: C.walnut, marginTop: 8, fontStyle: 'italic' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderRadius: 13, padding: 13, marginVertical: 14 },
  signOutTxt: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.danger, marginLeft: 8 },
  version: { fontSize: 9.5, fontFamily: F.body, color: C.walnut, textAlign: 'center', marginTop: 8, marginBottom: 14 },
});

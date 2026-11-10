import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { HomeHeader } from '../components/Headers';
import { Tile, SectionHeader, PrimaryButton, ProductImage, Price, Stars } from '../components/UI';
import { useStore, useActions } from '../store';

export default function Home({ navigation }) {
  const storeData = useStore();
  const PRODUCTS = storeData.products;
  const SPECIALS = storeData.specials;
  const { user, notifications, events, campaigns, orders, money } = storeData;
  const unread = notifications.filter((n) => n.unread).length;
  const nextEvent = events.find((e) => e.status === 'upcoming');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <HomeHeader
            name={user ? user.fullName : 'Bernice'}
            unread={unread > 0}
            onBell={() => navigation.navigate('Profile')}
            onProfile={() => navigation.navigate('Profile')}
          />

          {nextEvent ? (
            <Pressable onPress={() => navigation.navigate('Events')} style={[st.eventCard, shadow]}>
              <LinearGradient colors={[nextEvent.a, nextEvent.b]} style={st.eventGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.eventKicker}>UPCOMING CELEBRATION</Text>
                  <Text style={st.eventName}>{nextEvent.name}</Text>
                  <Text style={st.eventMeta}>
                    <Ionicons name="calendar-outline" size={10} color={C.espresso} /> {nextEvent.date} · {nextEvent.time}
                  </Text>
                  <Text style={st.eventMeta}><Ionicons name="location-outline" size={10} color={C.espresso} /> {nextEvent.venue}</Text>
                </View>
                <View style={st.eventBadge}>
                  <Text style={st.eventBadgeNum}>{Math.max(0, Math.ceil((new Date(nextEvent.date) - new Date()) / 86400000))}</Text>
                  <Text style={st.eventBadgeLabel}>days to go</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : null}

          <View style={st.tiles}>
            <Tile label="Create a Registry" icon="albums-outline" onPress={() => navigation.navigate('Registries')} />
            <Tile label="Send a Gift" icon="gift-outline" onPress={() => navigation.navigate('Gifts')} />
            <Tile label="Plan an Event" icon="calendar-outline" onPress={() => navigation.navigate('Events')} />
            <Tile label="Explore" icon="compass-outline" onPress={() => navigation.navigate('Specials')} />
          </View>

          <View style={{ paddingHorizontal: S.screen, marginTop: 16 }}>
            <Pressable onPress={() => navigation.navigate('Specials')}>
              <LinearGradient colors={['#A67830', '#C49A6C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.promo}>
                <View style={{ flex: 1 }}>
                  <Text style={st.promoKicker}>Convenience · Specials</Text>
                  <Text style={st.promoTitle}>Special Moments,{'\n'}Beautifully Gifted.</Text>
                  <Text style={st.promoBody}>Experience curated celebration and anniversary gifting.</Text>
                  <View style={st.promoBtn}><Text style={st.promoBtnText}>Shop Now</Text></View>
                </View>
                <Ionicons name="gift-sharp" size={86} color="rgba(30,24,16,0.28)" />
              </LinearGradient>
            </Pressable>
          </View>

          <View style={st.section}>
            <SectionHeader title="Quick Picks" action="View All" onAction={() => navigation.navigate('Gifts')} />
            <Text style={st.hint} />
            <View style={st.grid}>
              {PRODUCTS.slice(0, 4).map((p) => (
                <GiftMini key={p.id} p={p} money={money} onPress={() => navigation.navigate('GiftDetail', { id: p.id })} />
              ))}
            </View>
          </View>

          <View style={st.section}>
            <SectionHeader title="Tuyamika Specials" action="View All" onAction={() => navigation.navigate('Specials')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: S.screen, paddingRight: 10 }}>
              {SPECIALS.map((sp) => (
                <Pressable key={sp.id} onPress={() => navigation.navigate('GiftDetail', { id: sp.id })} style={{ marginRight: 12 }}>
                  <ProductImage item={sp} h={128} style={{ width: 148 }} />
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={st.section}>
            <SectionHeader title="Group Campaigns" action="View" />
            {campaigns.slice(0, 1).map((c) => {
              const pct = Math.round((c.raised / c.target) * 100);
              return (
                <Pressable key={c.id} onPress={() => navigation.navigate('GroupGifting')} style={[st.campCard, shadow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.campTitle}>{c.title}</Text>
                    <Text style={st.campAmount}>{money(c.raised)} <Text style={{ fontFamily: F.body, color: C.walnut }}>raised of {money(c.target)}</Text></Text>
                    <View style={st.barWrap}><View style={[st.bar, { width: `${pct}%` }]} /></View>
                  </View>
                  <View style={st.pctBadge}><Text style={st.pctTxt}>{pct}%</Text></View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function GiftMini({ p, onPress }) {
  return (
    <Pressable onPress={onPress} style={[st.mini, shadow]}>
      <ProductImage item={p} h={92} style={{ width: '100%' }} />
      <View style={{ padding: 9 }}>
        <Text style={st.miniName} numberOfLines={1}>{p.name}</Text>
        <Price amount={p.price} was={p.was} />
        <Stars rating={p.rating} small />
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  eventCard: { marginTop: 16, marginHorizontal: S.screen, borderRadius: 16, overflow: 'hidden' },
  eventGrad: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  eventKicker: { fontFamily: F.bodyBold, fontSize: 9, letterSpacing: 1.2, color: C.darkwood },
  eventName: { fontFamily: F.bodyBold, fontSize: 17, color: C.espresso, marginTop: 2 },
  eventMeta: { fontFamily: F.bodyMid, fontSize: 11, color: C.espresso, marginTop: 3 },
  eventBadge: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  eventBadgeNum: { fontFamily: F.bodyBold, fontSize: 18, color: C.espresso },
  eventBadgeLabel: { fontFamily: F.body, fontSize: 8, color: C.walnut },
  tiles: { flexDirection: 'row', marginTop: 16, paddingHorizontal: S.screen - 4 },
  section: { paddingHorizontal: S.screen, marginTop: 20 },
  hint: { fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mini: { width: '48.4%', backgroundColor: C.white, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  miniName: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.espresso, marginBottom: 3 },
  promo: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, overflow: 'hidden' },
  promoKicker: { fontFamily: F.bodyBold, fontSize: 9, letterSpacing: 1.2, color: C.ivory },
  promoTitle: { fontFamily: F.bodyBold, fontSize: 18, color: C.white, lineHeight: 23, marginTop: 4 },
  promoBody: { fontFamily: F.body, fontSize: 10.5, color: C.blush, marginTop: 5 },
  promoBtn: { backgroundColor: C.blush, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 10 },
  promoBtnText: { fontFamily: F.bodyBold, fontSize: 11, color: C.espresso },
  campCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' },
  campTitle: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.espresso },
  campAmount: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso, marginTop: 3 },
  barWrap: { height: 7, backgroundColor: C.blush, borderRadius: 7, marginTop: 9, overflow: 'hidden' },
  bar: { height: 7, backgroundColor: C.gold, borderRadius: 7 },
  pctBadge: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  pctTxt: { fontFamily: F.bodyBold, fontSize: 12, color: C.espresso },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton, GhostButton, ProductImage, Price } from '../components/UI';
import { useStore, useActions } from '../store';

const STATUS_LABEL = { available: ['Available', C.available], reserved: ['Reserving…', C.reserved], purchased: ['Taken', C.purchased] };
const ICONS_BY_SLOT = { available: 'heart-circle-outline', reserved: 'hourglass-outline', purchased: 'checkmark-circle-sharp' };

export default function RegistryDetail({ route, navigation }) {
  const { registries, money, products: PRODUCTS } = useStore();
  const { reserveRegistryItem } = useActions();
  const reg = registries.find((r) => r.id === route.params?.id);

  const info = useMemo(() => {
    const all = reg.items.reduce((n, it) => n + it.slots.length, 0);
    const taken = reg.items.reduce((n, it) => n + it.slots.filter((s) => s !== 'available').length, 0);
    const days = Math.max(0, Math.ceil((new Date(reg.date) - new Date()) / 86400000));
    return { all, taken, days, pct: all ? Math.round((taken / all) * 100) : 0 };
  }, [reg]);

  if (!reg) return null;

  const surpriseBooby = reg.items.map((it) => it.slots.filter((s) => s !== 'available').length).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient colors={[reg.coverA, reg.coverB]} style={st.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TopHeader title={reg.occasion} onBack={() => navigation.goBack()} right={<Ionicons name="share-social-outline" size={20} color={C.espresso} />} transparent />
            <View style={{ paddingHorizontal: S.screen }}>
              <Text style={st.name}>{reg.title}</Text>
              <Text style={st.owner}><Ionicons name="heart" size={11} color={C.danger} /> {reg.owner}</Text>
              {reg.message ? <Text style={st.msg}>“{reg.message}”</Text> : null}
              <View style={st.counts}>
                <View style={[st.count, shadow]}><Text style={st.countNum}>{info.days}</Text><Text style={st.countLbl}>days</Text></View>
                <View style={[st.count, shadow]}><Text style={st.countNum}>{info.taken}</Text><Text style={st.countLbl}>arranged</Text></View>
                <View style={[st.count, shadow]}><Text style={st.countNum}>{info.days}</Text><Text style={st.countLbl}>until {reg.occasion}</Text></View>
              </View>
              <View style={st.progressWrap}>
                <View style={st.barWrap}><View style={[st.bar, { width: `${info.pct || 8}%` }]} /></View>
                <Text style={st.shareTxt}>Help us build our dream home together:</Text>
                <GhostButton label="Share Registry" icon="share-social-outline" small style={{ marginTop: 10 }} onPress={() => navigation.replace('ShareRegistry', { title: reg.title })} />
              </View>
            </View>
          </LinearGradient>

          <View style={st.tabsRow}>
            <Text style={[st.tab, st.tabOn]}>Gift List</Text>
            <Text style={st.tab}>Contributions</Text>
          </View>

          <View style={{ paddingHorizontal: S.screen }}>
            {reg.items.map((it) => {
              const p = PRODUCTS.find((pp) => pp.id === it.productId) || {
                id: it.productId,
                name: it.productTitle || 'Gift',
                price: it.price || 0,
                a: reg.coverA || '#B18A52',
                b: reg.coverB || '#E8DCD0',
                icon: 'gift-sharp',
              };
              const pending = it.slots.some((s) => s === 'reserved');
              return (
                <View key={it.id} style={[st.gift, shadow]}>
                  <ProductImage item={p} h={64} style={{ width: 64 }} iconSize={22} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={st.giftName}>{p.name}</Text>
                    {it.variant ? <Text style={st.giftVar}>Variant: {it.variant}</Text> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      {it.slots.map((s, i) => (
                        <Ionicons key={i} name={ICONS_BY_SLOT[s]} size={12} color={STATUS_LABEL[s][1]} style={{ marginRight: 4 }} />
                      ))}
                    </View>
                    <Price amount={p.price} />
                    <Text style={st.giftStatus}>{it.slots.filter((s) => s === 'available').length} of {it.slots.length} still available</Text>
                  </View>
                  {it.slots.some((s) => s === 'available') ? (
                    <Pressable onPress={() => navigation.navigate('Checkout', { registryItemId: it.id, shareToken: reg.shareToken, name: p.name, price: p.price, cover: p.a })} style={st.reserveBtn}>
                      <Text style={st.reserveBtnTxt}>Reserve</Text>
                    </Pressable>
                  ) : (
                    <View style={[st.reserveBtn, { opacity: 0.15, backgroundColor: C.blush }]}>
                      <Text style={st.reserveBtnTxt}>{it.slots[0] === 'purchased' ? 'Taken' : 'Reserved'}</Text>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={[st.surprise, shadow]}>
              <Ionicons name="lock-closed-sharp" size={17} color={C.bronze} />
              <Text style={st.surpriseTxt}>Someone has arranged a gift for your special day! The surprise stays sealed until your celebration.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  cover: { paddingBottom: 18 },
  name: { fontFamily: F.bodyBold, fontSize: 21, color: C.espresso, marginTop: 2 },
  owner: { fontFamily: F.bodyMid, fontSize: 12, color: C.espresso, marginTop: 2 },
  msg: { fontFamily: F.body, fontSize: 11.5, color: C.darkwood, marginTop: 8, fontStyle: 'italic' },
  counts: { flexDirection: 'row', marginTop: 14 },
  count: { flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginRight: 10 },
  countNum: { fontFamily: F.bodyBold, fontSize: 18, color: C.espresso },
  countLbl: { fontFamily: F.body, fontSize: 9, color: C.walnut },
  progressWrap: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 12 },
  barWrap: { height: 8, backgroundColor: C.blush, borderRadius: 8, overflow: 'hidden' },
  bar: { height: 8, backgroundColor: C.gold, borderRadius: 8 },
  shareTxt: { fontFamily: F.body, fontSize: 10.5, color: C.darkwood, marginTop: 8 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: S.screen, paddingTop: 16, paddingBottom: 10 },
  tab: { fontFamily: F.bodyBold, fontSize: 13, color: C.walnut, marginRight: 16, paddingBottom: 4 },
  tabOn: { color: C.espresso, borderBottomWidth: 2, borderBottomColor: C.gold },
  gift: { backgroundColor: C.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  giftName: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso },
  giftVar: { fontFamily: F.body, fontSize: 10, color: C.walnut, marginTop: 2 },
  giftStatus: { fontFamily: F.bodyBold, fontSize: 10, color: C.darkwood, marginTop: 5 },
  reserveBtn: { backgroundColor: C.gold, borderRadius: 11, paddingHorizontal: 15, paddingVertical: 9 },
  reserveBtnTxt: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.white },
  surprise: { flexDirection: 'row', backgroundColor: C.paper, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  surpriseTxt: { flex: 1, fontFamily: F.bodyMid, fontSize: 11, color: C.darkwood, marginLeft: 10, lineHeight: 16 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton, GhostButton, ProductImage, Price } from '../components/UI';
import { FormNotice } from '../components/AuthFrame';
import { fetchGuestRegistry } from '../api/tuyamika.js';
import { isApiConfigured } from '../api/client.js';

const ICONS_BY_SLOT = { available: 'heart-circle-outline', reserved: 'hourglass-outline', purchased: 'checkmark-circle-sharp' };
const COLORS_BY_SLOT = { available: C.available, reserved: C.reserved, purchased: C.purchased };

// Opens when someone scans a QR / taps a tuyamika:// link or website link.
export default function GuestShare({ route, navigation }) {
  const shareToken = route.params?.token || '';
  const [registry, setRegistry] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isApiConfigured()) {
        setError('Registry links need the Tuyamika server connection. Open the app settings or check later.');
        setLoading(false);
        return;
      }
      try {
        const data = await fetchGuestRegistry(shareToken);
        if (!alive) return;
        if (!data || !data.id) {
          setError('That registry link is not available — it may be closed or private.');
        } else {
          setRegistry(data);
        }
      } catch (err) {
        if (alive) setError('Registry is unavailable right now. It may be private, closed or expired.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <SafeAreaView style={st.fill} edges={['top']}>
        <View style={[st.fill, { alignItems: 'center', justifyContent: 'center' }]} accessibilityRole="progressbar">
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={st.loadingText}>Opening the registry…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title={registry ? registry.occasion : 'Registry'} onBack={() => navigation.popToTop()} />
        {error ? (
          <View style={{ padding: S.screen }}>
            <FormNotice message={error} />
            <PrimaryButton label="Back home" onPress={() => navigation.popToTop()} style={{ marginTop: 18 }} />
          </View>
        ) : registry ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
            <LinearGradient colors={[registry.coverA, registry.coverB]} style={st.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={st.name}>{registry.title}</Text>
              <Text style={st.message}>{registry.message}</Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: S.screen }}>
              {registry.items.map((it) => {
                const pending = it.slots.some((s) => s === 'reserved');
                const available = it.slots.some((s) => s === 'available');
                return (
                  <View key={it.id} style={[st.gift, shadow]}>
                    <ProductImage item={{ a: registry.coverA, b: registry.coverB, icon: 'gift-sharp' }} h={64} style={{ width: 64 }} iconSize={22} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={st.giftName}>{it.productTitle}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        {it.slots.map((s, i) => (
                          <Ionicons key={i} name={ICONS_BY_SLOT[s]} size={12} color={COLORS_BY_SLOT[s]} style={{ marginRight: 4 }} />
                        ))}
                      </View>
                      <Price amount={it.price} />
                    </View>
                    <Pressable
                      disabled={!available}
                      onPress={() =>
                        navigation.navigate('Checkout', {
                          registryItemId: it.id,
                          shareToken: registry.shareToken,
                          name: it.productTitle,
                          price: it.price,
                          cover: registry.coverA,
                        })
                      }
                      style={[st.reserveBtn, !available && { opacity: 0.2 }]}
                    >
                      <Text style={st.reserveBtnTxt}>{it.slots[0] === 'purchased' ? 'Taken' : pending ? 'Reserving…' : 'Reserve'}</Text>
                    </Pressable>
                  </View>
                );
              })}
              {registry.items.length === 0 ? <Text style={st.emptyTxt}>No gifts listed yet — check back soon.</Text> : null}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.ivory },
  loadingText: { marginTop: 12, fontFamily: F.bodyMid, fontSize: 12, color: C.walnut },
  cover: { paddingBottom: 22, paddingHorizontal: S.screen },
  name: { fontFamily: F.bodyBold, fontSize: 21, color: C.espresso, marginTop: 26 },
  message: { fontFamily: F.body, fontSize: 12, color: C.darkwood, marginTop: 6, fontStyle: 'italic' },
  gift: { backgroundColor: C.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  giftName: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.espresso },
  reserveBtn: { backgroundColor: C.blush, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  reserveBtnTxt: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.espresso },
  emptyTxt: { fontFamily: F.body, fontSize: 12, color: C.walnut, marginTop: 16, textAlign: 'center' },
});

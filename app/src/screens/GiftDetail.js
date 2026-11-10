import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { ProductImage, Price, Stars, PrimaryButton, GhostButton } from '../components/UI';
import { useStore } from '../store';

export default function GiftDetail({ route, navigation }) {
  const id = route.params?.id || 'p1';
  const PRODUCTS = useStore().products;
  const p = PRODUCTS.find((x) => x.id === id);

  if (!p) return null;

  return (
    <SafeAreaView style={st.fill} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          <ProductImage item={p} h={290} radius={22} iconSize={64} style={{ margin: S.screen, marginBottom: 8 }} />

          <View style={{ paddingHorizontal: S.screen }}>
            <Text style={st.name}>{p.name}</Text>
            <Price amount={p.price} was={p.was} big />

            <Stars rating={p.rating} style={{ marginTop: 6 }} />

            <Text style={st.reviews}>
              <Ionicons name="heart" size={11} color={C.gold} /> {p.reviews} shoppers loved this · By {p.retailer}
            </Text>

            <Text style={st.desc}>{p.desc}</Text>

            <View style={st.metaRow}>
              <View style={[st.metaPill, shadow]}>
                <Ionicons name="calendar-outline" size={12} color={C.espresso} />
                <Text style={st.metaTxt}>In stock</Text>
              </View>
              <View style={[st.metaPill, shadow]}>
                <Ionicons name="cube-outline" size={12} color={C.espresso} />
                <Text style={st.metaTxt}>{p.prep}</Text>
              </View>
              <View style={[st.metaPill, shadow]}>
                <Ionicons name="options-outline" size={12} color={C.espresso} />
                <Text style={st.metaTxt}>{p.variants.length} variants</Text>
              </View>
            </View>

            <View style={st.qtyRow}>
              <Text style={st.qtyLabel}>Qty:</Text>
              <View style={st.qtyBox}>
                <Text style={st.qtyVal}>1 − 1 +</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[st.ctaRow, shadow]}>
          <PrimaryButton label="Add to Cart" small onPress={() => navigation.navigate('Checkout', { productId: p.id })} style={{ flex: 1 }} />
          <GhostButton label="Add to Registry" small style={{ flex: 1, marginLeft: 10 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.ivory },
  name: { fontFamily: F.bodyBold, fontSize: 20, color: C.espresso, marginTop: 4 },
  reviews: { fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginTop: 5 },
  desc: { fontFamily: F.body, fontSize: 12.5, color: C.espresso, lineHeight: 20, marginTop: 12 },
  metaRow: { flexDirection: 'row', marginTop: 14 },
  metaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10 },
  metaTxt: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.espresso, marginLeft: 5 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 18 },
  qtyLabel: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso, marginRight: 14 },
  qtyBox: { backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.4, borderColor: C.champagne },
  qtyVal: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso },
  ctaRow: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: C.ivory, padding: S.screen, borderTopColor: C.blush, borderTopWidth: 1 },
});

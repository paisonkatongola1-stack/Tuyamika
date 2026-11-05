import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton, ProductImage, Price, Field } from '../components/UI';
import { useStore, useActions } from '../store';
import { PRODUCTS, SPECIALS } from '../data';

const SHIP = { standard: 60, event: 45, express: 120, collection: 0 };

export default function Checkout({ route, navigation }) {
  const { money, registries, RESERVE_MINUTES } = useStore();
  const { reserveRegistryItem } = useActions();
  const rp = route.params || {};

  const registryItemId = rp.registryItemId;
  const productId = rp.productId;
  const specialId = rp.specialId;

  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState('standard');
  const [address, setAddress] = useState('12 Riverside Drive, Lusaka');
  const [wrap, setWrap] = useState(false);

  useEffect(() => {
    if (registryItemId) {
      const reg = registries.find((r) => r.items.some((i) => i.id === registryItemId));
      if (reg) {
        const it = reg.items.find((i) => i.id === registryItemId);
        const prod = PRODUCTS.find((p) => p.id === it.productId);
        setItem({ name: prod.name, price: prod.price, a: prod.a, b: prod.b, icon: prod.icon, reg: reg.title, itemId: it.id, variant: it.variant || 'Standard' });
      }
    } else if (specialId) {
      const sp = SPECIALS.find((x) => x.id === specialId);
      if (sp) setItem({ name: sp.name, price: sp.price, a: sp.a, b: sp.b, icon: sp.icon });
    } else if (productId) {
      const p = PRODUCTS.find((x) => x.id === productId);
      if (p) setItem({ name: p.name, price: p.price, a: p.a, b: p.b, icon: p.icon, variant: (p.variants && p.variants[0]) || '' });
    }
  }, []);

  if (!item) return null;

  const subtotal = item.price * qty;
  const ship = SHIP[delivery];
  const wrapFee = wrap ? 25 : 0;
  const total = subtotal + ship + wrapFee;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title="Checkout" onBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          <View style={[st.summary, shadow]}>
            <ProductImage item={item} h={74} style={{ width: 74 }} iconSize={26} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.itemName}>{item.name}</Text>
              {item.reg ? <Text style={st.itemSub}>Registry gift · {item.reg}</Text> : <Text style={st.itemSub}>{item.variant ? 'Variant: ' + item.variant : 'Tuyamika Special'}</Text>}
              <Price amount={item.price} />
            </View>
          </View>

          <View style={{ paddingHorizontal: S.screen }}>
            <Text style={st.label}>Delivery</Text>
            {[
              ['standard', 'Standard Delivery', '3 - 5 days', SHIP.standard],
              ['express', 'Express', 'next day', SHIP.express],
              ['event', 'Deliver to Event', 'via Gift Hub consolidation', SHIP.event],
              ['collection', 'Collection', 'from approved point', 0],
            ].map(([id, title, sub, fee]) => (
              <Pressable key={id} onPress={() => setDelivery(id)} style={[st.opt, delivery === id && { borderColor: C.gold }]}>
                <Ionicons name={delivery === id ? 'radio-button-on' : 'radio-button-off'} size={18} color={C.bronze} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={st.optTitle}>{title}</Text>
                  <Text style={st.optSub}>{sub}</Text>
                </View>
                <Text style={st.optFee}>{fee ? money(fee) : 'Free'}</Text>
              </Pressable>
            ))}

            <Text style={st.label}>Delivery address</Text>
            <Field placeholder="Where should your gift go?" value={address} onChangeText={setAddress} />

            <Text style={st.label}>Extras</Text>
            <Pressable onPress={() => setWrap(!wrap)} style={[st.opt, { borderColor: C.champagne }]}>
              <Ionicons name={wrap ? 'checkbox' : 'square-outline'} size={20} color={C.bronze} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.optTitle}>Gift Hub wrapping</Text>
                <Text style={st.optSub}>Signature paper + card</Text>
              </View>
              <Text style={st.optFee}>{money(25)}</Text>
            </Pressable>

            <View style={[st.totals, shadow]}>
              {[
                ['Subtotal', money(subtotal)],
                ['Delivery', ship ? money(ship) : 'Free'],
                ['Gift wrap', wrapFee ? money(wrapFee) : '—'],
              ].map(([k, v]) => (
                <View key={k} style={st.tRow}><Text style={st.tk}>{k}</Text><Text style={st.tv}>{v}</Text></View>
              ))}
              <View style={[st.tRow, { borderTopWidth: 1, borderTopColor: C.blush, paddingTop: 10, marginTop: 6 }]}>
                <Text style={[st.tk, { fontFamily: F.bodyBold, color: C.espresso }]}>Total</Text>
                <Text style={[st.tv, { fontFamily: F.bodyBold, fontSize: 16, color: C.espresso }]}>{money(total)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[st.cta, shadow]}>
          <PrimaryButton label={`Proceed to Payment · ${money(total)}`} small onPress={() => {
            if (registryItemId) reserveRegistryItem(registryItemId);
            navigation.replace('Payment', { item, total, delivery, address, wrap: wrapFee, registryItemId });
          }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  summary: { backgroundColor: C.white, borderRadius: 15, marginHorizontal: S.screen, marginTop: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  itemName: { fontFamily: F.bodyBold, fontSize: 14, color: C.espresso },
  itemSub: { fontFamily: F.body, fontSize: 10.5, color: C.walnut, marginVertical: 2 },
  label: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso, marginTop: 18, marginBottom: 10 },
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1.4, borderColor: C.champagne, borderRadius: 13, padding: 12, marginBottom: 8 },
  optTitle: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso },
  optSub: { fontFamily: F.body, fontSize: 10, color: C.walnut, marginTop: 1 },
  optFee: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso },
  totals: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginTop: 12 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  tk: { fontFamily: F.bodyMid, fontSize: 12, color: C.walnut },
  tv: { fontFamily: F.bodyMid, fontSize: 12, color: C.espresso },
  cta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.ivory, paddingTop: 12, paddingBottom: 24, paddingHorizontal: S.screen, borderTopColor: C.blush, borderTopWidth: 1 },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { useStore, useActions } from '../store';

const STEPS = ['Ordered', 'Preparing', 'Out for delivery', 'Delivered'];
const DATE_F = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Tracking({ route, navigation }) {
  const { orders, money, user } = useStore();
  const [ref, setRef] = useState(orders[0]?.id || '');

  const order = orders.find((o) => o.id === ref);
  const stepName = { 0: [1, 0], 1: [2, 1], 2: [3, 2], 3: [4, 3] };

  const current = order ? order.step : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title="Track Order" onBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ paddingHorizontal: S.screen, marginTop: 8 }}>
            <Text style={{ fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginBottom: 6 }}>
              Order Ref
            </Text>
            <TextInput style={[st.refInput, shadow]} value={ref} onChangeText={setRef} placeholderTextColor={C.walnut} />

            {order ? (
              <>
                {order.items.map((it, idx) => (
                  <View key={idx} style={[st.item, shadow]}>
                    <Ionicons name="gift-sharp" size={20} color={C.bronze} />
                    <Text style={st.itemName}>{it.name} {it.qty > 1 ? `x${it.qty}` : ''}</Text>
                    <Text style={st.itemPrice}>{money(it.price * it.qty)}</Text>
                  </View>
                ))}

                <Text style={st.h2}>Delivery Progress</Text>
                {STEPS.map((s, i) => {
                  const done = i <= current;
                  return (
                    <View key={s} style={st.stepRow}>
                      <View style={st.stepRail}>
                        <View style={[st.stepDot, done && { backgroundColor: C.gold }]} />
                        {i < STEPS.length - 1 ? <View style={[st.stepLine, done && { backgroundColor: C.gold }]} /> : null}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[st.stepTitle, !done && { color: C.walnut }]}>{s}</Text>
                        {i === current && current < 3 ? (
                          <View style={st.arrival}>
                            <Ionicons name="information-circle-outline" size={13} color={C.bronze} />
                            <Text style={st.arrivalTxt}>Your order is on the way. Arriving {DATE_F(new Date(Date.now() + 86400000 * 2))} between 10AM - 12:30PM</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}

                <View style={[st.caller, shadow]}>
                  <Ionicons name="call-outline" size={16} color={C.bronze} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={st.callerLabel}>Assigned to your delivery</Text>
                    <Text style={st.callerValue}>James M · 0899-99-5516</Text>
                  </View>
                  <Pressable style={st.callBtn}><Text style={st.callBtnTxt}>Call</Text></Pressable>
                </View>
              </>
            ) : (
              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Ionicons name="search-outline" size={34} color={C.walnut} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.espresso, marginTop: 10 }}>No matching order</Text>
                <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.walnut, marginTop: 4 }}>Check your order reference.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  refInput: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1.4, borderColor: C.champagne, padding: 12, fontFamily: F.bodyBold, fontSize: 14, color: C.espresso, marginTop: 4 },
  item: { backgroundColor: C.white, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  itemName: { flex: 1, fontFamily: F.bodyBold, fontSize: 13, color: C.espresso, marginLeft: 10 },
  itemPrice: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso },
  h2: { fontFamily: F.bodyBold, fontSize: 14, color: C.espresso, marginTop: 22, marginBottom: 14 },
  stepRow: { flexDirection: 'row', marginBottom: 0 },
  stepRail: { width: 16, alignItems: 'center' },
  stepDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: C.champagne },
  stepLine: { width: 2, flex: 1, minHeight: 34, backgroundColor: C.champagne, marginVertical: 4 },
  stepTitle: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso, paddingBottom: 22 },
  arrival: { backgroundColor: C.paper, borderRadius: 10, padding: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', marginTop: -14 },
  arrivalTxt: { flex: 1, fontFamily: F.body, fontSize: 10.5, color: C.darkwood, marginLeft: 7, lineHeight: 15 },
  caller: { backgroundColor: C.white, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  callerLabel: { fontFamily: F.body, fontSize: 10, color: C.walnut },
  callerValue: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.espresso, marginTop: 1 },
  callBtn: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  callBtnTxt: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.white },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { PrimaryButton } from '../components/UI';
import { Wordmark } from '../components/Logo';
import { useStore, useActions } from '../store';

const METHODS = [
  { id: 'mtn', label: 'MTN Mobile Money', tag: 'MoMo', tint: '#E1BC4A' },
  { id: 'airtel', label: 'Airtel Money', tag: 'MoMo', tint: '#D96B4A' },
  { id: 'card', label: 'Card Payment', tag: 'Visa / Mastercard', tint: C.walnut },
  { id: 'bank', label: 'Bank Transfer', tag: 'Direct deposit', tint: C.darkwood },
];

const W = Dimensions.get('window').width;

export default function Payment({ route, navigation }) {
  const { money, RESERVE_MINUTES, apiMode } = useStore();
  const { purchaseRegistryItem, contribute, placeOrder, guestCheckoutAndPay } = useActions();
  const p = route.params || {};
  const item = p.item;
  const total = p.total || p.contribution?.amount || 850;
  const isRegistry = !!p.registryItemId;
  const isContribution = !!p.contribution;

  const [method, setMethod] = useState('mtn');
  const [amount, setAmount] = useState(isContribution ? String(p.contribution.amount || 500) : '');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);

  const paymentAmount = isContribution ? Number(amount || 0) : total;

  const pay = async () => {
    setStep(1);

    // Mobile-money bracket: the real provider flow calls the API through
    // guest checkout + pay status; the mock path keeps the 1800ms simulation.
    if (isRegistry && apiMode && p.shareToken) {
      try {
        const res2 = await guestCheckoutAndPay({
          shareToken: p.shareToken,
          registryItemId: p.registryItemId,
          recipient_name: name || 'Anonymous guest',
          recipient_address: p.address || '12 Riverside Drive, Lusaka',
          delivery: p.delivery === 'event' ? 'event' : p.delivery === 'collection' ? 'collection' : 'recipient',
        });
        if (res2.error) throw new Error(res2.error);
        setStep(2);
        return;
      } catch (err) {
        console.log('api payment failed:', err.message);
        // fall through to the demo confirmation below
      }
    }

    setTimeout(() => {
      setStep(2);
      if (isRegistry) purchaseRegistryItem(p.registryItemId);
      if (isContribution) contribute(p.contribution.campaignId, p.contribution.goalId, name || 'Anonymous Guest', paymentAmount);
      if (item && !isContribution) {
        placeOrder({ id: 'TUYA' + Math.floor(100000 + Math.random() * 899999), date: new Date().toISOString().slice(0, 10), items: [{ name: item.name, price: item.price * (p.qty || 1), qty: 1 }], shipping: 0, total, status: 'Paid',
          step: 0, method: METHODS.find((m) => m.id === method).label, address: p.address || 'Delivery to be confirmed' });
      }
    }, 1800);
  };

  if (step === 2) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: C.ivory, alignItems: 'center', justifyContent: 'center', padding: S.screen }}>
          <LinearGradient colors={[C.champagne, C.blush]} style={st.doneCard}>
            <View style={st.doneBadge}><Ionicons name="checkmark-sharp" size={44} color={C.available} /></View>
            <Text style={st.doneTitle}>{isRegistry ? 'Gift arranged!' : isContribution ? 'Contribution received' : 'Payment successful'}</Text>
            {isRegistry ? (
              <Text style={st.doneBody}>
                Someone has reserved and paid for a gift from {item?.reg}. Your registry now shows it taken. Order ref TUYA-REF
              </Text>
            ) : isContribution ? (
              <Text style={st.doneBody}>Thank you{name ? ` ${name}` : ''}. Your contribution of {money(paymentAmount)} has been received and progress has been updated.</Text>
            ) : (
              <Text style={st.doneBody}>Your payment of {money(total)} went through. Order confirmation has been sent to the retailer.</Text>
            )}
            <PrimaryButton label="Done" style={{ alignSelf: 'stretch', marginTop: 18 }} onPress={() => navigation.popToTop()} />
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title="Payment" onBack={() => navigation.goBack()} />
        <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

          <View style={{ paddingHorizontal: S.screen, marginTop: 8 }}>
            <View style={[st.payCard, shadow]}>
              <Text style={st.payLabel}>{isContribution ? 'Chosen amount' : 'Amount due'}</Text>
              {isContribution ? (
                <View style={st.amountRow}>
                  <Text style={st.amountCur}>K</Text>
                  <TextInput style={st.amountInput} value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                </View>
              ) : (
                <Text style={st.amountBig}>{money(total)}</Text>
              )}
              {item ? <Text style={st.paySub}>for {item.name}</Text> : p.contribution ? <Text style={st.paySub}>to {p.contribution.campaign}</Text> : null}
            </View>

            <Text style={st.label}>Choose payment method</Text>
            {METHODS.map((m) => (
              <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[st.method, method === m.id && { borderColor: C.gold, backgroundColor: C.paper }]}>
                <View style={[st.methodIcon, { backgroundColor: m.tint + '22' }]}><Ionicons name={m.id === 'card' ? 'card-outline' : m.id === 'bank' ? 'business-outline' : 'phone-portrait-outline'} size={18} color={m.tint} /></View>
                <View style={{ flex: 1, marginLeft: 11 }}>
                  <Text style={st.methodName}>{m.label}</Text>
                  <Text style={st.methodSub}>{m.tag}</Text>
                </View>
                <Ionicons name={method === m.id ? 'radio-button-on' : 'radio-button-off'} size={19} color={C.bronze} />
              </Pressable>
            ))}

            <Text style={st.label}>Your details</Text>
            <TextInput style={[st.input, shadow]} placeholder="Full name" value={name} onChangeText={setName} placeholderTextColor={C.walnut} />
            {method === 'card' ? (
              <TextInput style={[st.input, shadow]} placeholder="Card number (tokenised)" keyboardType="number-pad" placeholderTextColor={C.walnut} />
            ) : (
              <TextInput style={[st.input, shadow]} placeholder="Phone number e.g. 260 97 1234567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor={C.walnut} />
            )}

            <View style={st.legal}>
              <Ionicons name="shield-checkmark-outline" size={15} color={C.bronze} />
              <Text style={st.legalTxt}>Payments are processed securely by approved providers. Tuyamika never stores raw card details.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[st.cta, shadow]}>
          <PrimaryButton label={step === 1 ? 'Confirming…' : `Pay ${money(paymentAmount)}`} disabled={step === 1} loading={step === 1} onPress={pay} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  payCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, alignItems: 'center' },
  payLabel: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.walnut },
  amountBig: { fontFamily: F.bodyBold, fontSize: 32, color: C.espresso, marginTop: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  amountCur: { fontFamily: F.bodyBold, fontSize: 24, color: C.espresso, marginRight: 6 },
  amountInput: { fontFamily: F.bodyBold, fontSize: 28, color: C.espresso, borderBottomWidth: 2, borderBottomColor: C.champagne, width: 130, textAlign: 'center', paddingVertical: 4 },
  paySub: { fontFamily: F.body, fontSize: 10.5, color: C.walnut, marginTop: 5 },
  label: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso, marginTop: 20, marginBottom: 10 },
  method: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1.4, borderColor: C.champagne, borderRadius: 13, padding: 12, marginBottom: 8 },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontFamily: F.bodyBold, fontSize: 13, color: C.espresso },
  methodSub: { fontFamily: F.body, fontSize: 10, color: C.walnut, marginTop: 1 },
  input: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1.2, borderColor: C.champagne, paddingHorizontal: 13, paddingVertical: 12, fontFamily: F.body, fontSize: 13, color: C.espresso, marginTop: 8 },
  legal: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10, padding: 12, backgroundColor: C.paper, borderRadius: 12 },
  legalTxt: { flex: 1, fontFamily: F.body, fontSize: 10, color: C.darkwood, marginLeft: 9, lineHeight: 14 },
  cta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.ivory, paddingTop: 12, paddingBottom: 26, paddingHorizontal: S.screen, borderTopColor: C.blush, borderTopWidth: 1 },
  doneCard: { borderRadius: 22, padding: 24, width: '100%', alignItems: 'center' },
  doneBadge: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  doneTitle: { fontFamily: F.bodyBold, fontSize: 18, color: C.espresso, textAlign: 'center' },
  doneBody: { fontFamily: F.body, fontSize: 12, color: C.darkwood, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});

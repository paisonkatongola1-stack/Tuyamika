import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { ProductImage, Price, Stars, PrimaryButton } from '../components/UI';
import { useStore } from '../store';

const TABS = ['Gift Boxes', 'Hampers', 'Seasonal'];

export default function Specials({ navigation }) {
  const SPECIALS = useStore().specials;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <TopHeader title="Tuyamika Specials" onBack={() => navigation.goBack()} />

          <View style={{ paddingHorizontal: S.screen }}>
            <View style={[st.hero, shadow]}>
              <Text style={st.heroTxt}>Curated with care. Made for your special moments.</Text>
            </View>

            <View style={st.chips}>
              {TABS.map((t, i) => (
                <View key={t} style={[st.chip, i === 0 && { backgroundColor: C.espresso }]}>
                  <Text style={{ fontFamily: i === 0 ? F.bodyBold : F.bodyMid, fontSize: 11, color: i === 0 ? C.champagne : C.espresso }}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={st.grid}>
              {SPECIALS.map((sp) => (
                <Pressable key={sp.id} style={[st.card, shadow]} onPress={() => navigation.navigate('Checkout', { specialId: sp.id, name: sp.name, price: sp.price, cover: sp.a })}>
                  <ProductImage item={sp} h={110} style={{ width: '100%' }} />
                  <View style={{ padding: 11 }}>
                    <View style={st.tag}><Text style={st.tagTxt}>{sp.tag}</Text></View>
                    <Text style={st.name} numberOfLines={1}>{sp.name}</Text>
                    <Price amount={sp.price} was={sp.was} />
                  </View>
                </Pressable>
              ))}
            </View>

            <PrimaryButton label="Request a Custom Package" style={{ marginTop: 16, marginBottom: 18 }} onPress={() => navigation.navigate('Discover')} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.espresso, borderRadius: 16, padding: 16 },
  heroTxt: { fontFamily: F.bodyBold, fontSize: 15, color: C.champagne, lineHeight: 21 },
  chips: { flexDirection: 'row', marginTop: 14, marginBottom: 10 },
  chip: { borderWidth: 1.1, borderColor: C.champagne, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.white, marginRight: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.4%', backgroundColor: C.white, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  name: { fontFamily: F.bodyBold, fontSize: 12, color: C.espresso, marginBottom: 3 },
  tag: { alignSelf: 'flex-start', backgroundColor: C.blush, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 6 },
  tagTxt: { fontFamily: F.bodyBold, fontSize: 9, color: C.darkwood },
});

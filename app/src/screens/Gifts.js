import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { ProductImage, Price, Stars, PressCard } from '../components/UI';
import { CATEGORIES } from '../data';
import { useStore } from '../store';

export default function Gifts({ navigation, route }) {
  const { products: PRODUCTS } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('pop');

  const items = PRODUCTS
    .filter((p) => (cat === 'all' ? true : p.cat === cat))
    .filter((p) => (q ? p.name.toLowerCase().includes(q.toLowerCase()) : true))
    .slice()
    .sort((a, b) => (sort === 'priceL' ? a.price - b.price : sort === 'priceH' ? b.price - a.price : b.rating - a.rating));

  return (
    <SafeAreaView style={st.fill} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }} stickyHeaderIndices={[1]}>
          <View style={{ paddingHorizontal: S.screen, paddingTop: 14, backgroundColor: C.ivory }}>
            <Text style={st.h1}>Gifts</Text>
            <View style={st.searchBox}>
              <Ionicons name="search" size={16} color={C.walnut} />
              <TextInput style={st.search} placeholder="Search gifts, stores, events…" placeholderTextColor={C.walnut} value={q} onChangeText={setQ} />
            </View>
          </View>

          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chips} contentContainerStyle={{ paddingHorizontal: S.screen }}>
              <Chip label="All" active={cat === 'all'} onPress={() => setCat('all')} />
              {CATEGORIES.map((c) => (
                <Chip key={c.id} label={c.label} active={cat === c.id} onPress={() => setCat(c.id)} icon={c.icon} />
              ))}
            </ScrollView>
          </View>

          <View style={st.sortRow}>
            {[['pop', 'Popular'], ['priceL', 'Price › Low'], ['priceH', 'Price › High']].map(([id, label]) => (
              <Pressable key={id} onPress={() => setSort(id)}>
                <Text style={[st.sort, sort === id && st.sortOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={st.grid}>
            {items.map((p) => (
              <PressCard key={p.id} p={p} onPress={() => navigation.navigate('GiftDetail', { id: p.id })} />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={[st.chip, active && { backgroundColor: C.espresso, borderColor: C.espresso }]}>
      {icon ? <Ionicons name={icon} size={12} color={active ? C.champagne : C.walnut} style={{ marginRight: 5 }} /> : null}
      <Text style={{ fontFamily: active ? F.bodyBold : F.bodyMid, fontSize: 11, color: active ? C.champagne : C.espresso }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.ivory },
  h1: { fontFamily: F.display, fontSize: 24, color: C.espresso },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, borderWidth: 1, borderColor: C.blush },
  search: { flex: 1, fontFamily: F.bodyMid, fontSize: 12.5, color: C.espresso, marginLeft: 8, paddingVertical: 0 },
  chips: { marginTop: 12, maxHeight: 40 },
  sortRow: { flexDirection: 'row', paddingHorizontal: S.screen, marginTop: 12, marginBottom: 4 },
  sort: { fontFamily: F.bodyMid, fontSize: 11, color: C.walnut, marginRight: 14 },
  sortOn: { fontFamily: F.bodyBold, color: C.espresso },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: S.screen, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.1, borderColor: C.champagne, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.white, marginRight: 8 },
});

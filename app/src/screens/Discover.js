import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { Stars } from '../components/UI';
import { useStore } from '../store';

export default function Discover({ navigation }) {
  const PROVIDERS = useStore().providers;
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('All');

  const cats = ['All', 'Decorators', 'Venues', 'DJs & MCs', 'Catering', 'Bakers', 'Photographers'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          <View style={{ paddingHorizontal: S.screen, paddingTop: 14, backgroundColor: C.ivory }}>
            <Text style={st.h1}>Discover</Text>
            <View style={st.search}>
              <Ionicons name="search" size={16} color={C.walnut} />
              <TextInput placeholder="Search businesses, services…" style={st.searchInput} value={q} onChangeText={setQ} placeholderTextColor={C.walnut} />
            </View>
          </View>

          <View style={st.chips}>
            {cats.map((cid) => (
              <Pressable key={cid} onPress={() => setTab(cid)} style={[st.chip, tab === cid && { backgroundColor: C.espresso, borderColor: C.espresso }]}>
                <Text style={{ fontFamily: tab === cid ? F.bodyBold : F.bodyMid, fontSize: 11, color: tab === cid ? C.champagne : C.espresso }}>{cid}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ paddingHorizontal: S.screen }}>
            {PROVIDERS.map((b) => (
              <View key={b.id} style={[st.card, shadow]}>
                <View style={st.avatarWrap}><Ionicons name={b.icon} size={22} color={C.darkwood} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.name}>{b.name}</Text>
                  <Text style={st.type}>{b.type} · {b.location}</Text>
                  <Stars rating={b.rating} small />
                </View>
                <Pressable style={st.quoteBtn} onPress={() => navigation.navigate('Profile')}>
                  <Text style={st.quoteTxt}>Quote</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 24, color: C.espresso },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, borderWidth: 1, borderColor: C.blush },
  searchInput: { flex: 1, fontFamily: F.bodyMid, fontSize: 12.5, color: C.espresso, marginLeft: 8, paddingVertical: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: S.screen, marginTop: 12, marginBottom: 8 },
  chip: { borderWidth: 1.1, borderColor: C.champagne, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: C.white, marginRight: 8, marginBottom: 8 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarWrap: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: F.bodyBold, fontSize: 13.5, color: C.espresso },
  type: { fontFamily: F.body, fontSize: 10.5, color: C.walnut, marginVertical: 2 },
  quoteBtn: { backgroundColor: C.gold, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 9 },
  quoteTxt: { fontFamily: F.bodyBold, fontSize: 11.5, color: C.white },
});

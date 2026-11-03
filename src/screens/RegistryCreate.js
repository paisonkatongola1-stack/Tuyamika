import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { TopHeader } from '../components/Headers';
import { Field, PrimaryButton } from '../components/UI';
import { useActions, useStore } from '../store';
import { OCCASIONS } from '../data';

export default function RegistryCreate({ navigation }) {
  const { createRegistry } = useActions();
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [visibility, setVisibility] = useState('link');
  const [err, setErr] = useState({});

  const save = (publish) => {
    const e = {};
    if (!title.trim()) e.title = 'Registry name is required';
    if (!occasion) e.occasion = 'Select an occasion';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Use format YYYY-MM-DD';
    setErr(e);
    if (Object.keys(e).length) return;
    createRegistry({ title, occasion, date, message, visibility, coverA: '#B18A52', coverB: '#E8DCD0', status: publish ? 'active' : 'draft' });
    navigation.replace('ShareRegistry', { title });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        <TopHeader title="Create Registry" onBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: S.screen }}>

          <View style={[st.hint, shadow]}>
            <Ionicons name="information-circle-outline" size={18} color={C.bronze} />
            <Text style={st.hintTxt}>Add products from Tuyamika Gifts after you publish. Guests only see published registries.</Text>
          </View>

          <Field label="Registry name" placeholder="e.g. Our Wedding Registry" value={title} onChangeText={setTitle} error={err.title} style={{ marginTop: 14 }} />

          <Text style={st.label}>Occasion</Text>
          <View style={st.occasionWrap}>
            {OCCASIONS.map((o) => (
              <Pressable key={o} onPress={() => setOccasion(o)} style={[st.occasion, occasion === o && { backgroundColor: C.espresso, borderColor: C.espresso }]}>
                <Text style={{ fontFamily: occasion === o ? F.bodyBold : F.bodyMid, fontSize: 11, color: occasion === o ? C.champagne : C.espresso }}>{o}</Text>
              </Pressable>
            ))}
          </View>
          {err.occasion ? <Text style={st.err}>{err.occasion}</Text> : null}

          <Field label="Event date (YYYY-MM-DD)" placeholder="2027-01-12" value={date} onChangeText={(t) => setDate(t.replace(/[^0-9-]/g, '').slice(0, 10))} error={err.date} keyboardType="number-pad" style={{ marginTop: 8 }} />
          <Field label="Message to guests" placeholder="A few warm words for your guests…" value={message} onChangeText={setMessage} multiline style={{ marginTop: 8 }} />

          <Text style={st.label}>Visibility</Text>
          {[
            ['link', 'Unlisted — only guests with your link'],
            ['public', 'Public — discoverable on Tuyamika'],
            ['private', 'Private — only you can see it'],
          ].map(([id, label]) => (
            <Pressable key={id} onPress={() => setVisibility(id)} style={[st.visRow, visibility === id && { borderColor: C.gold, backgroundColor: C.paper }]}>
              <Ionicons name={visibility === id ? 'radio-button-on' : 'radio-button-off'} size={18} color={C.bronze} />
              <Text style={st.visTxt}>{label}</Text>
            </Pressable>
          ))}

          <View style={st.ctaRow}>
            <PrimaryButton label="Save Draft" small tint="ghost" style={{ flex: 1 }} onPress={() => save(false)} />
            <PrimaryButton label="Publish" small style={{ flex: 1, marginLeft: 10 }} onPress={() => save(true)} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  hint: { flexDirection: 'row', backgroundColor: C.paper, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  hintTxt: { flex: 1, fontFamily: F.body, fontSize: 10.5, color: C.darkwood, marginLeft: 8, lineHeight: 15 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: C.espresso, marginTop: 16, marginBottom: 8 },
  occasionWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  occasion: { borderWidth: 1.1, borderColor: C.champagne, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: C.white, marginRight: 8, marginBottom: 8 },
  visRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.1, borderColor: C.champagne, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: C.white },
  visTxt: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.espresso, marginLeft: 10 },
  err: { fontFamily: F.body, fontSize: 10.5, color: C.danger, marginTop: 2 },
  ctaRow: { flexDirection: 'row', marginTop: 22, marginBottom: 20 },
});

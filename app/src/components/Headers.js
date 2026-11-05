import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';
import { SunSpiral, Wordmark } from './Logo';

export function TopHeader({ title, onBack, right, transparent }) {
  return (
    <View style={[st.header, transparent && { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={st.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.espresso} />
        </Pressable>
      ) : (
        <View style={{ width: 38 }} />
      )}
      <Text style={st.title} numberOfLines={1}>{title}</Text>
      <View style={{ width: 38, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function HomeHeader({ name, onBell, onProfile, unread, onSearch, searchValue, searchPlaceholder }) {
  return (
    <View style={st.homehead}>
      <View style={st.hrow}>
        <SunSpiral size={34} color={C.gold} />
        <Wordmark size={17} color={C.espresso} align="left" style={{}} />
        <View style={st.icons}>
          <Pressable onPress={onBell} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={C.espresso} />
            {unread ? <View style={st.dot} /> : null}
          </Pressable>
          <Pressable onPress={onProfile} hitSlop={8} style={{ marginLeft: 14 }}>
            <Ionicons name="person-circle-outline" size={26} color={C.espresso} />
          </Pressable>
        </View>
      </View>
      {onSearch ? (
        <View style={st.search}>
          <Ionicons name="search" size={15} color={C.walnut} />
          <TextInput placeholder={searchPlaceholder || 'Search gifts, stores, events…'} style={st.searchInput} value={searchValue} onChangeText={onSearch} placeholderTextColor={C.walnut} />
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, ...shadow },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, ...shadow },
  title: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.espresso, flex: 1, textAlign: 'center' },
  homehead: { paddingHorizontal: S.screen, paddingTop: 14 },
  hrow: { flexDirection: 'row', alignItems: 'center' },
  icons: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  dot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9, marginTop: 12, borderWidth: 1, borderColor: C.blush },
  searchInput: { flex: 1, fontFamily: F.bodyMid, fontSize: 12.5, color: C.espresso, marginLeft: 8, paddingVertical: 0 },
});

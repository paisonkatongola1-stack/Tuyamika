import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, shadow } from '../theme';

export function PrimaryButton({ label, onPress, style, icon, small, tint = C.gold, disabled, loading, textColor = C.white }) {
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={[{ opacity: disabled ? 0.55 : 1 }, style]}
      disabled={disabled || loading}
    >
      <LinearGradient
        colors={[C.gold, C.honey]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={st.pbutt}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {icon ? <Ionicons name={icon} size={small ? 15 : 17} color={textColor} style={{ marginRight: 8 }} /> : null}
            <Text style={{ fontFamily: F.bodyBold, color: textColor, fontSize: small ? 13.5 : 15, letterSpacing: 0.3 }}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, style, icon, tint = C.espresso, dark }) {
  return (
    <Pressable onPress={onPress} style={[st.gbutt, dark && { backgroundColor: 'rgba(255,255,255,0.14)' }, style]}>
      {icon ? <Ionicons name={icon} size={16} color={dark ? C.white : tint} style={{ marginRight: 8 }} /> : null}
      <Text style={{ fontFamily: F.bodyBold, color: dark ? C.white : tint, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, placeholder, value, onChangeText, secure, error, style, keyboardType, multiline }) {
  return (
    <View style={style}>
      {label ? <Text style={st.flabel}>{label}</Text> : null}
      <View style={[st.field, error && { borderColor: C.danger }]}>
        <TextInput style={{ flex: 1, fontFamily: F.bodyMid, fontSize: 13.5, color: C.espresso, paddingVertical: 0 }} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.walnut} secureTextEntry={secure} keyboardType={keyboardType} multiline={multiline} />
      </View>
      {error ? <Text style={st.ferror}>{error}</Text> : null}
    </View>
  );
}

import { TextInput as TextInputBase } from 'react-native';

export function Card({ children, style, tint = C.white, pad }) {
  return <View style={[st.card, { backgroundColor: tint }, pad && { padding: pad }, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 15.5, color: C.espresso }}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction}><Text style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: C.bronze }}>{action}</Text></Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress, icon, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.chip, active && { backgroundColor: C.espresso, borderColor: C.espresso }, style]}
    >
      {icon ? <Ionicons name={icon} size={13} color={active ? C.champagne : C.walnut} style={{ marginRight: 5 }} /> : null}
      <Text style={{ fontFamily: active ? F.bodyBold : F.bodyMid, fontSize: 11.5, color: active ? C.champagne : C.espresso }}>{label}</Text>
    </Pressable>
  );
}

export function Price({ amount, was, big }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontFamily: F.bodyBold, fontSize: big ? 24 : 14, color: C.espresso }}>{money(amount)}</Text>
      {was ? <Text style={{ fontFamily: F.body, fontSize: big ? 13 : 11, color: C.walnut, textDecorationLine: 'line-through', marginLeft: 7 }}>{money(was)}</Text> : null}
    </View>
  );
}

export function Stars({ rating, small }) {
  const full = Math.floor(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={i < full ? 'star' : 'star-outline'} size={small ? 10 : 12} color={C.gold} />
      ))}
      <Text style={{ fontFamily: F.bodyMid, fontSize: small ? 9.5 : 11, color: C.walnut, marginLeft: 4 }}>{rating}</Text>
    </View>
  );
}

export function StatusPill({ status }) {
  const map = {
    available: ['Available', C.available],
    reserved: ['Reserved', C.reserved],
    purchased: ['Purchased', C.purchased],
  };
  const [label, color] = map[status] || ['Available', C.available];
  return (
    <View style={{ backgroundColor: color + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 10, color }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ pct, h = 7, tint = C.gold, bg = C.blush }) {
  return (
    <View style={{ height: h, backgroundColor: bg, borderRadius: h, overflow: 'hidden' }}>
      <View style={{ height: h, width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: tint, borderRadius: h }} />
    </View>
  );
}

export function Empty({ icon, title, body }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Ionicons name={icon} size={28} color={C.walnut} />
      </View>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.espresso, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 12, color: C.walnut, textAlign: 'center', marginTop: 4 }}>{body}</Text>
    </View>
  );
}

export function Tile({ label, icon, onPress, containerStyle }) {
  return (
    <Pressable onPress={onPress} style={[st.tile, containerStyle]}>
      <View style={st.tileIcon}><Ionicons name={icon} size={20} color={C.darkwood} /></View>
      <Text style={st.tileLabel}>{label}</Text>
    </Pressable>
  );
}

export const money = (n) => 'K' + n.toLocaleString('en-ZM');

export function ProductImage({ item, h = 110, radius = 14, iconSize = 34, style }) {
  return (
    <LinearGradient
      colors={[item.a || C.champagne, item.b || C.blush]}
      start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 1 }}
      style={[{ height: h, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View pointerEvents="none" accessible={false} style={{ width: Math.round(h * 0.52), height: Math.round(h * 0.52), borderRadius: Math.round(h * 0.26), backgroundColor: 'rgba(248,244,236,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={item.icon || 'gift-sharp'} size={iconSize} color={C.darkwood} />
      </View>
    </LinearGradient>
  );
}

export function TabBarIcon({ focused, icon, iconOff, bg = C.gold }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? bg : 'transparent' }}>
      <Ionicons name={focused ? icon : iconOff || icon} size={focused ? 18 : 20} color={focused ? C.white : C.walnut} />
    </View>
  );
}

const st = StyleSheet.create({
  pbutt: { borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold },
  gbutt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1.4, borderColor: C.champagne, backgroundColor: 'transparent' },
  flabel: { fontFamily: F.bodyMid, fontSize: 11.5, color: C.espresso, marginBottom: 6 },
  field: { borderWidth: 1.2, borderColor: C.champagne, borderRadius: 12, backgroundColor: C.white, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  ferror: { fontFamily: F.body, fontSize: 10.5, color: C.danger, marginTop: 4 },
  card: { borderRadius: S.card, ...shadow },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.1, borderColor: C.champagne, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: C.white },
  tile: { backgroundColor: C.white, borderRadius: 16, alignItems: 'center', paddingVertical: 12, flex: 1, marginHorizontal: 4, ...shadow },
  tileIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.blush, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLabel: { fontFamily: F.bodyMid, fontSize: 10.5, color: C.espresso },
});

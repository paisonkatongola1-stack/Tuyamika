import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Line } from 'react-native-svg';
import { C, F } from '../theme';

export function SunSpiral({ size = 44, color = C.gold }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 48 48">
      <G stroke={color} fill="none" strokeWidth={2.4} strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const ang = (i * Math.PI) / 6;
          const r1 = 16.5, r2 = 21.5;
          return (
            <Line
              key={i}
              x1={24 + Math.cos(ang) * r1} y1={24 + Math.sin(ang) * r1}
              x2={24 + Math.cos(ang) * r2} y2={24 + Math.sin(ang) * r2}
            />
          );
        })}
        <Path d="M24 33.5 a9.5 9.5 0 1 1 9.2 -11.8 a7.4 7.4 0 1 0 -7.9 8.6 a5.6 5.6 0 1 1 5.4 -7" />
        <Circle cx={24} cy={24} r={1.6} fill={color} stroke="none" />
      </G>
    </Svg>
  );
}

export function Wordmark({ size = 30, color = C.espresso, tagline = false, tagColor = C.espresso, align = 'center' }) {
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={{ fontFamily: F.display, fontSize: size, color, letterSpacing: size * 0.16, lineHeight: size * 1.28 }}>TUYAMIKA</Text>
      {tagline ? (
        <Text style={{ fontFamily: F.bodyMid, fontSize: size * 0.34, color: tagColor, marginTop: 2, letterSpacing: 0.2 }}>
          The Beauty of Giving, The Joy of Sharing.
        </Text>
      ) : null}
    </View>
  );
}

export function LogoLockup({ size = 30, tint = C.espresso, tagline = true }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <SunSpiral size={size * 1.5} color={tint === C.espresso ? C.gold : tint} />
      <Wordmark size={size} color={tint} tagline={tagline} />
    </View>
  );
}

export const Rule = ({ w = 90, c = C.gold }) => <View style={{ height: 2, width: w, backgroundColor: c, borderRadius: 2, alignSelf: 'center' }} />;

export const Diamond = ({ size = 8, c = C.gold }) => (
  <View style={{ width: size, height: size, backgroundColor: c, transform: [{ rotate: '45deg' }], borderRadius: 2 }} />
);

export const OrnamentLine = ({ c = C.gold, w = 150 }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ height: 1.5, width: 46, backgroundColor: c }} />
    <View style={{ marginHorizontal: 8 }}><Diamond c={c} /></View>
    <View style={{ height: 1.5, width: 46, backgroundColor: c }} />
  </View>
);

const s = StyleSheet.create({});

export default null;

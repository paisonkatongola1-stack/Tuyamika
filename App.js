import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useFonts as usePoppins, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useFonts as useAlkatra, Alkatra_600SemiBold, Alkatra_700Bold } from '@expo-google-fonts/alkatra';
import { StoreProvider } from './src/store';
import { AuthProvider } from './src/auth/AuthProvider';
import { C } from './src/theme';
import Splash from './src/screens/Splash';
import RootNav from './src/screens/RootNav';

export default function App() {
  const [poppins] = usePoppins({ Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  const [alkatra] = useAlkatra({ Alkatra_600SemiBold, Alkatra_700Bold });
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    if (poppins && alkatra) {
      const t = setTimeout(() => setSplash(false), 1800);
      return () => clearTimeout(t);
    }
  }, [poppins, alkatra]);

  const ready = poppins && alkatra;

  return (
    <SafeAreaProvider>
      <ExpoStatusBar style="dark" backgroundColor={C.blush} />
      <View style={{ flex: 1, backgroundColor: C.ivory }}>
        {!ready ? <ActivityIndicator style={{ marginTop: '60%' }} color={C.gold} /> : splash ? <Splash /> : (
          <StoreProvider>
            <AuthProvider>
              <RootNav />
            </AuthProvider>
          </StoreProvider>
        )}
      </View>
    </SafeAreaProvider>
  );
}

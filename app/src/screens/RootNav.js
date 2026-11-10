import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { PrimaryButton } from '../components/UI';
import { AuthFrame } from '../components/AuthFrame';
import { useAuth } from '../auth/AuthProvider';
import Welcome from './Welcome';
import Register from './Register';
import Login from './Login';
import PasswordRecovery from './PasswordRecovery';
import ProfileSetup from './ProfileSetup';
import GiftPreferences from './GiftPreferences';
import GuestShare from './GuestShare';
import MainNav from './MainNav';

const Stack = createNativeStackNavigator();

// QR codes / share links land here: tuyamika://r/<token>
const linking = {
  prefixes: ['tuyamika://', 'https://tuyamika.co.zm', 'https://tuyamika.co.zw'],
  config: { screens: { Main: { screens: { GuestShare: 'r/:token' } } } },
};

function AuthenticationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="PasswordRecovery" component={PasswordRecovery} />
    </Stack.Navigator>
  );
}

function OnboardingStack({ user }) {
  const firstScreen = user?.fullName ? 'GiftPreferences' : 'ProfileSetup';
  return (
    <Stack.Navigator initialRouteName={firstScreen} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
      <Stack.Screen name="GiftPreferences" component={GiftPreferences} />
    </Stack.Navigator>
  );
}

function SessionLoading() {
  return (
    <SafeAreaView style={st.center} accessibilityRole="progressbar" accessibilityLabel="Restoring your session">
      <ActivityIndicator color={C.gold} size="large" />
      <Text style={st.loadingText}>Restoring your session…</Text>
    </SafeAreaView>
  );
}

export default function RootNav() {
  const { loading, loadError, session, user, guest, reloadSession } = useAuth();

  if (loading) return <SessionLoading />;
  if (loadError) {
    return (
      <AuthFrame title="Session unavailable">
        <Text style={st.errorText}>{loadError}</Text>
        <PrimaryButton label="Try again" onPress={reloadSession} style={{ marginTop: 18 }} />
      </AuthFrame>
    );
  }

  const authenticated = !!session && !!user;
  const mode = guest || (authenticated && user.onboardingComplete)
    ? 'main'
    : authenticated
      ? 'onboarding'
      : 'authentication';

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator key={mode} screenOptions={{ headerShown: false }}>
        {mode === 'main' ? (
          <Stack.Screen name="Main" component={MainNav} />
        ) : mode === 'onboarding' ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingStack user={user} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Authentication" component={AuthenticationStack} />
        )}
        <Stack.Screen name="GuestShare" component={GuestShare} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ivory },
  loadingText: { marginTop: 12, fontFamily: F.bodyMid, fontSize: 12, color: C.walnut },
  errorText: { marginTop: 18, fontFamily: F.body, fontSize: 13, lineHeight: 20, color: C.darkwood },
});

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F } from '../theme';
import Home from './Home';
import Gifts from './Gifts';
import GiftDetail from './GiftDetail';
import Registries from './Registries';
import RegistryDetail from './RegistryDetail';
import RegistryCreate from './RegistryCreate';
import ShareRegistry from './ShareRegistry';
import GroupGifting from './GroupGifting';
import Events from './Events';
import EventDetail from './EventDetail';
import Specials from './Specials';
import Discover from './Discover';
import Checkout from './Checkout';
import Payment from './Payment';
import Tracking from './Tracking';
import Profile from './Profile';

const TAB = {
  Home: { on: 'home', off: 'home-outline' },
  Gifts: { on: 'gift', off: 'gift-outline' },
  Registries: { on: 'albums', off: 'albums-outline' },
  Events: { on: 'calendar', off: 'calendar-outline' },
  Discover: { on: 'compass', off: 'compass-outline' },
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelStyle: { fontFamily: F.bodyMid, fontSize: 10 },
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.blush, borderTopWidth: 1, height: 64, paddingTop: 7 },
        tabBarActiveTintColor: C.espresso,
        tabBarInactiveTintColor: C.walnut,
        tabBarIcon: ({ focused }) => (
          <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.gold : 'transparent' }}>
            <Ionicons name={focused ? TAB[route.name].on : TAB[route.name].off} size={focused ? 17 : 19} color={focused ? C.white : C.walnut} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Gifts" component={Gifts} />
      <Tab.Screen name="Registries" component={Registries} />
      <Tab.Screen name="Events" component={Events} />
      <Tab.Screen name="Discover" component={Discover} />
    </Tab.Navigator>
  );
}

export default function MainNav() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="App" component={Tabs} />
      <RootStack.Screen name="GiftDetail" component={GiftDetail} options={{ animation: 'slide_from_bottom' }} />
      <RootStack.Screen name="RegistryDetail" component={RegistryDetail} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="RegistryCreate" component={RegistryCreate} />
      <RootStack.Screen name="ShareRegistry" component={ShareRegistry} />
      <RootStack.Screen name="GroupGifting" component={GroupGifting} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="EventDetail" component={EventDetail} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="Specials" component={Specials} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="Checkout" component={Checkout} options={{ animation: 'slide_from_bottom' }} />
      <RootStack.Screen name="Payment" component={Payment} />
      <RootStack.Screen name="Tracking" component={Tracking} options={{ animation: 'slide_from_right' }} />
      <RootStack.Screen name="Profile" component={Profile} />
    </RootStack.Navigator>
  );
}

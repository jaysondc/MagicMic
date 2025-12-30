import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from './screens/HomeScreen';
import AddSongScreen from './screens/AddSongScreen';
import SongDetailsScreen from './screens/SongDetailsScreen';
import SettingsScreen from './screens/SettingsScreen';
import QueueScreen from './screens/QueueScreen';
import { theme } from './lib/theme';
import { ToastProvider } from './context/ToastContext';
import { PreviewProvider } from './context/PreviewContext';
import { DialogProvider } from './context/DialogContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <PreviewProvider>
            <DialogProvider>
              <NavigationContainer>
                <Stack.Navigator
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: theme.colors.surface,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                    },
                    headerTintColor: theme.colors.text,
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                    cardStyle: { backgroundColor: theme.colors.background },
                  }}
                >
                  <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="AddSong"
                    component={AddSongScreen}
                    options={{ title: 'Add Song' }}
                  />
                  <Stack.Screen
                    name="SongDetails"
                    component={SongDetailsScreen}
                    options={{ title: 'Song Details' }}
                  />
                  <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={{ title: 'Backup & Restore' }}
                  />
                  <Stack.Screen
                    name="Queue"
                    component={QueueScreen}
                    options={{ headerShown: false }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </DialogProvider>
          </PreviewProvider>
        </ToastProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

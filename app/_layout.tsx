import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "MobileCode" }} />
        <Stack.Screen name="sessions" options={{ title: "Sessions" }} />
        <Stack.Screen name="chat" options={{ title: "Chat" }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "MobileCode" }} />
        <Stack.Screen name="sessions" options={{ title: "Sessions" }} />
        <Stack.Screen name="chat" options={{ title: "Chat" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

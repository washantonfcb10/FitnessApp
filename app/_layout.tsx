import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '../src/lib/database';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

function RootLayoutContent() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark, colors } = useTheme();

  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    setupDatabase();
  }, []);

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>Database Error</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Initializing...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.headerBackground,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.text,
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="routine/[id]"
          options={{
            title: 'Routine',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="routine/create"
          options={{
            title: 'Create Routine',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{
            title: 'Workout',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/faq"
          options={{
            title: 'FAQ',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/exercises"
          options={{
            title: 'Manage Exercises',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="profile/progress-photos"
          options={{
            title: 'Progress Photos',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';

const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const { themeMode, isDark, colors, setThemeMode } = useTheme();

  const handleDarkModeToggle = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>FIT</Text>
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>FitnessApp</Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Version {APP_VERSION}
        </Text>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Enable dark theme
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: '#E5E5EA', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROGRESS</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={() => router.push('/profile/progress-photos')}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>📸</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Progress Photos</Text>
              <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                View your workout pump pictures
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/profile/exercises')}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>💪</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Manage Exercises</Text>
              <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                View all exercises and add custom ones
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/profile/faq')}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>❓</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>FAQ</Text>
              <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                Frequently asked questions
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Made with dedication
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
  },
});

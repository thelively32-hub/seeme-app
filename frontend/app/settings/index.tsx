import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n';
import api from '../../src/services/api';

const SettingRow = ({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showArrow = true,
  rightComponent,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
}) => (
  <TouchableOpacity 
    style={styles.settingRow} 
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={[styles.settingIcon, { backgroundColor: `${iconColor || '#ff7b35'}20` }]}>
      <Ionicons name={icon as any} size={20} color={iconColor || '#ff7b35'} />
    </View>
    <Text style={styles.settingLabel}>{label}</Text>
    {rightComponent ? (
      rightComponent
    ) : (
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {showArrow && <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />}
      </View>
    )}
  </TouchableOpacity>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      t.settings.logout,
      t.settings.logoutConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.logout,
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t.settings.deleteAccount,
      t.settings.deleteAccountConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount();
              await logout();
              router.replace('/');
            } catch (e) {
              Alert.alert(t.common.error, t.errors.generic);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t.settings.language,
      '',
      [
        {
          text: t.settings.english,
          onPress: () => setLanguage('en'),
        },
        {
          text: t.settings.spanish,
          onPress: () => setLanguage('es'),
        },
        { text: t.common.cancel, style: 'cancel' },
      ]
    );
  };

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings.title}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionHeader title={t.settings.account} />
        <View style={styles.section}>
          <SettingRow
            icon="person-outline"
            label={t.settings.editProfile}
            onPress={() => router.push('/settings/edit-profile')}
          />
        </View>

        {/* Privacy */}
        <SectionHeader title={t.settings.privacy} />
        <View style={styles.section}>
          <SettingRow
            icon="eye-off-outline"
            iconColor="#9c27b0"
            label={t.profile.anonymous}
            showArrow={false}
            rightComponent={
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255, 123, 53, 0.5)' }}
                thumbColor={isAnonymous ? '#ff7b35' : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title={t.settings.notifications} />
        <View style={styles.section}>
          <SettingRow
            icon="notifications-outline"
            iconColor="#2196f3"
            label={t.settings.notifications}
            showArrow={false}
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255, 123, 53, 0.5)' }}
                thumbColor={notifications ? '#ff7b35' : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Preferences */}
        <SectionHeader title={t.settings.preferences} />
        <View style={styles.section}>
          <SettingRow
            icon="language-outline"
            iconColor="#4caf50"
            label={t.settings.language}
            value={language === 'en' ? t.settings.english : t.settings.spanish}
            onPress={handleLanguageChange}
          />
        </View>

        {/* Legal */}
        <SectionHeader title={t.settings.legal} />
        <View style={styles.section}>
          <SettingRow
            icon="document-text-outline"
            iconColor="#ffc107"
            label={t.settings.termsOfService}
            onPress={() => router.push('/legal/terms')}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor="#4caf50"
            label={t.settings.privacyPolicy}
            onPress={() => router.push('/legal/privacy')}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title={t.settings.dangerZone} />
        <View style={styles.section}>
          <SettingRow
            icon="log-out-outline"
            iconColor="#ff9800"
            label={t.settings.logout}
            showArrow={false}
            onPress={handleLogout}
          />
          <SettingRow
            icon="trash-outline"
            iconColor="#f44336"
            label={t.settings.deleteAccount}
            showArrow={false}
            onPress={handleDeleteAccount}
          />
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t.settings.version} 1.0.0</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});

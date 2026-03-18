import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const SettingRow = ({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showArrow = true,
  rightComponent,
  danger = false,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  danger?: boolean;
}) => (
  <TouchableOpacity 
    style={styles.settingRow} 
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={[styles.settingIcon, { backgroundColor: `${iconColor || COLORS.gold.primary}20` }]}>
      <Ionicons name={icon as any} size={20} color={iconColor || COLORS.gold.primary} />
    </View>
    <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
    {rightComponent ? (
      rightComponent
    ) : (
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {showArrow && <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />}
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
  const [notifications, setNotifications] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [language, setLanguage] = useState('es');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
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
      'Eliminar Cuenta',
      '¿Estás seguro? Esta acción no se puede deshacer. Todos tus datos serán eliminados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount();
              await logout();
              router.replace('/');
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la cuenta');
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
      'Idioma',
      'Selecciona tu idioma',
      [
        {
          text: 'English',
          onPress: () => setLanguage('en'),
        },
        {
          text: 'Español',
          onPress: () => setLanguage('es'),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionHeader title="CUENTA" />
        <View style={styles.section}>
          <SettingRow
            icon="person-outline"
            label="Editar Perfil"
            onPress={() => router.push('/settings/edit-profile')}
          />
        </View>

        {/* Premium */}
        <SectionHeader title="PREMIUM" />
        <View style={styles.section}>
          <SettingRow
            icon="star"
            iconColor={COLORS.gold.primary}
            label="Actualizar a PRO"
            value="Vibes ilimitados"
            onPress={() => Alert.alert('Próximamente', 'La suscripción premium estará disponible pronto')}
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="PRIVACIDAD" />
        <View style={styles.section}>
          <SettingRow
            icon="eye-off-outline"
            iconColor="#9c27b0"
            label="Modo Fantasma"
            showArrow={false}
            rightComponent={
              <Switch
                value={ghostMode}
                onValueChange={setGhostMode}
                trackColor={{ false: COLORS.background.card, true: `${COLORS.gold.primary}50` }}
                thumbColor={ghostMode ? COLORS.gold.primary : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICACIONES" />
        <View style={styles.section}>
          <SettingRow
            icon="notifications-outline"
            iconColor="#2196f3"
            label="Notificaciones Push"
            showArrow={false}
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: COLORS.background.card, true: `${COLORS.gold.primary}50` }}
                thumbColor={notifications ? COLORS.gold.primary : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Preferences */}
        <SectionHeader title="PREFERENCIAS" />
        <View style={styles.section}>
          <SettingRow
            icon="language-outline"
            iconColor="#4caf50"
            label="Idioma"
            value={language === 'en' ? 'English' : 'Español'}
            onPress={handleLanguageChange}
          />
        </View>

        {/* Legal */}
        <SectionHeader title="LEGAL" />
        <View style={styles.section}>
          <SettingRow
            icon="document-text-outline"
            iconColor="#ffc107"
            label="Términos de Servicio"
            onPress={() => router.push('/legal/terms')}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor="#4caf50"
            label="Política de Privacidad"
            onPress={() => router.push('/legal/privacy')}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="ZONA DE PELIGRO" />
        <View style={styles.section}>
          <SettingRow
            icon="log-out-outline"
            iconColor="#ff9800"
            label="Cerrar Sesión"
            showArrow={false}
            onPress={handleLogout}
          />
          <SettingRow
            icon="trash-outline"
            iconColor={COLORS.accent.error}
            label="Eliminar Cuenta"
            showArrow={false}
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>See Me v1.0.0</Text>
          <Text style={styles.madeWithText}>Made with 💛 for connecting people</Text>
        </View>
      </ScrollView>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.muted,
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 12,
    marginLeft: 4,
  },
  section: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
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
    color: COLORS.text.primary,
  },
  settingLabelDanger: {
    color: COLORS.accent.error,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  madeWithText: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 4,
  },
});

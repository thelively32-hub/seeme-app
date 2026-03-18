import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

interface UserProfile {
  name: string;
  email: string;
  age?: number;
  gender?: string;
  looking_for?: string;
  intention?: string;
  is_visible: boolean;
}

interface UserStats {
  total_checkins: number;
  places_visited: number;
  current_streak: number;
}

// Menu Item Component
const MenuItem = ({ 
  icon, 
  label, 
  onPress, 
  showArrow = true,
  danger = false,
}: { 
  icon: string; 
  label: string; 
  onPress: () => void;
  showArrow?: boolean;
  danger?: boolean;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={danger ? COLORS.accent.error : COLORS.gold.primary} 
      />
    </View>
    <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
    {showArrow && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
    )}
  </TouchableOpacity>
);

// Stat Badge Component
const StatBadge = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.statBadge}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileData, statsData] = await Promise.all([
        api.getProfile(),
        api.getUserStats(),
      ]);
      setProfile(profileData);
      setStats(statsData);
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.gold.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={COLORS.gradients.goldButton as [string, string, string]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {profile?.name ? getInitials(profile.name) : '?'}
              </Text>
            </LinearGradient>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color={COLORS.text.dark} />
            </TouchableOpacity>
          </View>

          {/* Name & Info */}
          <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatBadge value={stats?.total_checkins || 0} label="Check-ins" />
            <View style={styles.statsDivider} />
            <StatBadge value={stats?.places_visited || 0} label="Places" />
            <View style={styles.statsDivider} />
            <StatBadge value={stats?.current_streak || 0} label="Streak" />
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => router.push('/settings/edit-profile')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem 
              icon="person-outline" 
              label="Personal Information" 
              onPress={() => router.push('/settings/edit-profile')}
            />
            <MenuItem 
              icon="notifications-outline" 
              label="Notifications" 
              onPress={() => {}}
            />
            <MenuItem 
              icon="shield-outline" 
              label="Privacy" 
              onPress={() => router.push('/legal/privacy')}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          <View style={styles.menuCard}>
            <MenuItem 
              icon="help-circle-outline" 
              label="Help Center" 
              onPress={() => {}}
            />
            <MenuItem 
              icon="document-text-outline" 
              label="Terms of Service" 
              onPress={() => router.push('/legal/terms')}
            />
            <MenuItem 
              icon="chatbubble-outline" 
              label="Contact Us" 
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuItem 
              icon="log-out-outline" 
              label="Log Out" 
              onPress={handleLogout}
              showArrow={false}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>See Me v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.background.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background.card,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statBadge: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border.light,
  },
  editProfileButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  editProfileText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gold.primary,
  },
  menuSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconDanger: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  menuLabelDanger: {
    color: COLORS.accent.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 10,
    marginBottom: 20,
  },
});

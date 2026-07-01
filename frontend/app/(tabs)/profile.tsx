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
  Switch,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';
import TourTooltip from '../../src/components/TourTooltip';

const getInitials = (name: string) =>
  name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

const MenuItem = ({ icon, label, onPress, danger = false }: {
  icon: string; label: string; onPress: () => void; danger?: boolean;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon as any} size={20} color={danger ? '#FF5555' : COLORS.text.secondary} />
    <Text style={[styles.menuLabel, danger && { color: '#FF5555' }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.text.muted} />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingGhost, setTogglingGhost] = useState(false);

  const isPremium = user?.is_premium || profile?.is_premium || false;

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await api.getProfile();
      setProfile(profileData);
      setGhostMode(profileData?.ghost_mode || false);
      try {
        const statsData = await (api as any).getUserStats?.();
        setStats(statsData);
      } catch {}
    } catch (e) {
      console.log('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGhostToggle = async (value: boolean) => {
    if (!isPremium) {
      Alert.alert(
        '👻 Ghost Mode',
        'Ghost Mode is a Vibe Me Pro feature. Upgrade to browse invisibly.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: '✨ Go Pro', onPress: () => router.push('/premium') },
        ]
      );
      return;
    }
    try {
      setTogglingGhost(true);
      await (api as any).updatePresence?.({ ghost_mode: value });
      setGhostMode(value);
    } catch {
      Alert.alert('Error', 'Could not update Ghost Mode.');
    } finally {
      setTogglingGhost(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.gold.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Premium Banner */}
        {!isPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={() => router.push('/premium')} activeOpacity={0.85}>
            <LinearGradient
              colors={['#2a1f00', '#4a3500', '#2a1f00']}
              style={styles.premiumBannerGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <View style={styles.premiumBannerLeft}>
                <Text style={{ fontSize: 24 }}>👑</Text>
                <View>
                  <Text style={styles.premiumBannerTitle}>Upgrade to Vibe Me Pro</Text>
                  <Text style={styles.premiumBannerSub}>Ghost Mode · Unlimited Vibes · See who viewed you</Text>
                </View>
              </View>
              <View style={styles.premiumBannerBtn}>
                <Text style={styles.premiumBannerBtnText}>Go Pro</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {isPremium && <View style={styles.premiumRing} />}
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[COLORS.gold.primary, COLORS.gold.secondary || '#B8860B']} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials(profile?.name || user?.name || 'U')}</Text>
              </LinearGradient>
            )}
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={{ fontSize: 14 }}>👑</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{profile?.name || user?.name || 'User'}</Text>
          {(profile?.phone_number || user?.phone_number) && (
            <Text style={styles.profileSub}>{profile?.phone_number || user?.phone_number}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats?.total_checkins || 0}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats?.vibes_sent || 0}</Text>
              <Text style={styles.statLabel}>Vibes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats?.friends_count || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>

          {profile?.vibes && profile.vibes.length > 0 && (
            <View style={styles.vibesRow}>
              {profile.vibes.slice(0, 4).map((v: string, i: number) => (
                <View key={i} style={styles.vibePill}>
                  <Text style={styles.vibePillText}>{v}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/settings/edit-profile')}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>

          {/* Ghost Mode */}
          <View style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(150,150,255,0.15)' }]}>
                  <Ionicons name="eye-off-outline" size={20} color="#9B9BFF" />
                </View>
                <View>
                  <Text style={styles.actionLabel}>Ghost Mode</Text>
                  <Text style={styles.actionSub}>{isPremium ? 'Browse invisibly' : 'Pro feature'}</Text>
                </View>
              </View>
              {isPremium ? (
                <Switch
                  value={ghostMode}
                  onValueChange={handleGhostToggle}
                  disabled={togglingGhost}
                  trackColor={{ false: '#333', true: COLORS.gold.primary }}
                  thumbColor={ghostMode ? '#000' : '#888'}
                />
              ) : (
                <TouchableOpacity style={styles.lockBtn} onPress={() => router.push('/premium')}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.gold.primary} />
                  <Text style={styles.lockBtnText}>Unlock</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Who viewed you */}
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/premium')}>
            <View style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                  <Ionicons name="eye-outline" size={20} color={COLORS.gold.primary} />
                </View>
                <View>
                  <Text style={styles.actionLabel}>Who viewed you</Text>
                  <Text style={styles.actionSub}>{isPremium ? 'See your viewers' : 'Pro feature'}</Text>
                </View>
              </View>
              {isPremium ? (
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
              ) : (
                <View style={styles.lockBtn}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.gold.primary} />
                  <Text style={styles.lockBtnText}>Unlock</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* My Vibe */}
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/settings/select-vibe')}>
            <View style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,100,100,0.15)' }]}>
                  <Ionicons name="flame-outline" size={20} color="#FF6464" />
                </View>
                <View>
                  <Text style={styles.actionLabel}>My Vibe</Text>
                  <Text style={styles.actionSub}>What are you feeling today?</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
            </View>
          </TouchableOpacity>

          {/* Status */}
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/settings/status')}>
            <View style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(100,255,150,0.15)' }]}>
                  <Ionicons name="location-outline" size={20} color="#64FF96" />
                </View>
                <View>
                  <Text style={styles.actionLabel}>My Status</Text>
                  <Text style={styles.actionSub}>Update your presence</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings simplified */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="person-outline" label="Edit Profile" onPress={() => router.push('/settings/edit-profile')} />
            <MenuItem icon="shield-checkmark-outline" label="Safety & Privacy" onPress={() => router.push('/settings/safety')} />
            <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/legal/terms')} />
            <MenuItem icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
            <MenuItem icon="log-out-outline" label="Log Out" onPress={handleLogout} danger />
          </View>
        </View>

        <Text style={styles.version}>Vibe Me v1.0.0</Text>
      </ScrollView>
      <TourTooltip screen="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gold.primary, letterSpacing: 3 },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  premiumBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  premiumBannerGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  premiumBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  premiumBannerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gold.primary },
  premiumBannerSub: { fontSize: 11, color: 'rgba(255,215,0,0.7)', marginTop: 2 },
  premiumBannerBtn: { backgroundColor: COLORS.gold.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  premiumBannerBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  profileCard: { marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  premiumRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 48, borderWidth: 2, borderColor: COLORS.gold.primary, zIndex: 0 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.gold.primary },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 30, fontWeight: '800', color: '#000' },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.background.primary, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  profileSub: { fontSize: 13, color: COLORS.text.muted, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: COLORS.text.primary },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  vibesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  vibePill: { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  vibePillText: { fontSize: 12, color: COLORS.gold.primary, fontWeight: '500' },
  editBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  editBtnText: { fontSize: 14, color: COLORS.text.secondary, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.text.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  actionCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  actionSub: { fontSize: 12, color: COLORS.text.muted, marginTop: 1 },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  lockBtnText: { fontSize: 12, color: COLORS.gold.primary, fontWeight: '600' },
  menuCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text.primary },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.text.muted, marginTop: 8, marginBottom: 20 },
});

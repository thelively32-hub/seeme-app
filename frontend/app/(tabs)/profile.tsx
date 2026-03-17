import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');

interface UserStats {
  vibes: number;
  connection_rate: number;
  total_checkins: number;
  unique_places: number;
  best_night: string;
  is_premium: boolean;
}

interface CheckinHistory {
  id: string;
  place_name: string;
  checked_in_at: string;
}

const StatCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PlaceHistoryCard = ({
  name,
  date,
}: {
  name: string;
  date: string;
}) => (
  <View style={styles.placeHistoryCard}>
    <View style={styles.placeHistoryInfo}>
      <Text style={styles.placeHistoryName}>{name}</Text>
      <Text style={styles.placeHistoryDate}>{date}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<CheckinHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsData, historyData] = await Promise.all([
        api.getUserStats(),
        api.getCheckinHistory(5),
      ]);
      setStats(statsData);
      setCheckinHistory(historyData);
    } catch (e) {
      console.error('Error loading profile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshUser();
    loadData();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7b35" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff7b35"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Avatar with Eye Logo */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#ff7b35', '#ec407a']}
              style={styles.avatarGradient}
            >
              <Ionicons name="person" size={48} color="#fff" />
            </LinearGradient>
            <View style={styles.eyeBadge}>
              <Ionicons name="eye" size={20} color="#ff7b35" />
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          {stats?.is_premium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={14} color="#ffc107" />
              <Text style={styles.premiumText}>SEE ME LIVE</Text>
            </View>
          )}
        </View>

        {/* VIBE STATS */}
        <View style={styles.vibeStatsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={18} color="#ffc107" />
            <Text style={styles.sectionTitle}>VIBE STATS</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon="hand-right"
              value={stats?.vibes || user?.vibes || 0}
              label="Vibes"
              color="#ff7b35"
            />
            <StatCard
              icon="trending-up"
              value={`${stats?.connection_rate || 0}%`}
              label="Connection Rate"
              color="#4caf50"
            />
          </View>
          <View style={styles.statsGridRow2}>
            <StatCard
              icon="location"
              value={stats?.unique_places || 0}
              label="Places Visited"
              color="#2196f3"
            />
            <StatCard
              icon="checkmark-circle"
              value={stats?.total_checkins || 0}
              label="Total Check-ins"
              color="#9c27b0"
            />
          </View>
        </View>

        {/* Places You've Been */}
        {checkinHistory.length > 0 && (
          <View style={styles.placesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleWhite}>Recent Check-ins</Text>
            </View>
            {checkinHistory.map((checkin) => (
              <PlaceHistoryCard
                key={checkin.id}
                name={checkin.place_name}
                date={formatDate(checkin.checked_in_at)}
              />
            ))}
          </View>
        )}

        {/* Best Night */}
        {stats?.best_night && (
          <View style={styles.bestNightSection}>
            <LinearGradient
              colors={['rgba(255, 123, 53, 0.15)', 'rgba(236, 64, 122, 0.1)']}
              style={styles.bestNightCard}
            >
              <View style={styles.bestNightHeader}>
                <Ionicons name="flame" size={20} color="#ff7b35" />
                <Text style={styles.bestNightTitle}>BEST NIGHT</Text>
              </View>
              <Text style={styles.bestNightValue}>{stats.best_night}</Text>
              <Text style={styles.bestNightSubtext}>Your most active night</Text>
            </LinearGradient>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff5555" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d0415',
    borderWidth: 3,
    borderColor: '#0d0415',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  premiumText: {
    color: '#ffc107',
    fontSize: 12,
    fontWeight: '600',
  },
  vibeStatsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffc107',
    letterSpacing: 1,
  },
  sectionTitleWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statsGridRow2: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textAlign: 'center',
  },
  placesSection: {
    marginBottom: 24,
  },
  placeHistoryCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeHistoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeHistoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  placeHistoryDate: {
    fontSize: 12,
    color: '#ff7b35',
  },
  bestNightSection: {
    marginBottom: 24,
  },
  bestNightCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.3)',
  },
  bestNightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bestNightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff7b35',
    letterSpacing: 1,
  },
  bestNightValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  bestNightSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff5555',
    fontWeight: '500',
  },
});

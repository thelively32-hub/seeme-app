import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

const { width } = Dimensions.get('window');

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
  location,
  date,
  tags,
}: {
  name: string;
  location: string;
  date: string;
  tags: string[];
}) => (
  <View style={styles.placeHistoryCard}>
    <View style={styles.placeHistoryInfo}>
      <Text style={styles.placeHistoryName}>{name}</Text>
      <Text style={styles.placeHistoryLocation}>{location}</Text>
      <Text style={styles.placeHistoryDate}>{date}</Text>
    </View>
    <View style={styles.placeHistoryTags}>
      {tags.map((tag, index) => (
        <View key={index} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  </View>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  // Mock data for profile
  const profileData = {
    name: user?.name || 'Alex',
    vibes: user?.vibes || 124,
    connectionRate: user?.connectionRate || 18,
    placesVisited: 12,
    bestNight: 'Saturday',
  };

  const placeHistory = [
    { name: 'Neon Club', location: 'Hollywood', date: 'Sat 8:00pm', tags: ['Friends', 'Dancing', 'Top'] },
    { name: 'Skybar Rooftop', location: 'Downtown', date: 'Fri 9:30pm', tags: ['Date', 'Drinks'] },
  ];

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
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
          <Text style={styles.profileName}>{profileData.name}</Text>
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
              value={profileData.vibes}
              label="Vibes"
              color="#ff7b35"
            />
            <StatCard
              icon="trending-up"
              value={`${profileData.connectionRate}%`}
              label="Connection Rate"
              color="#4caf50"
            />
          </View>
        </View>

        {/* Places You've Been */}
        <View style={styles.placesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Places You've Been</Text>
            <View style={styles.sectionIcons}>
              <Ionicons name="location" size={18} color="rgba(255,255,255,0.5)" />
              <Ionicons name="grid" size={18} color="rgba(255,255,255,0.5)" style={{ marginLeft: 12 }} />
            </View>
          </View>
          {placeHistory.map((place, index) => (
            <PlaceHistoryCard key={index} {...place} />
          ))}
        </View>

        {/* Best Night */}
        <View style={styles.bestNightSection}>
          <LinearGradient
            colors={['rgba(255, 123, 53, 0.15)', 'rgba(236, 64, 122, 0.1)']}
            style={styles.bestNightCard}
          >
            <View style={styles.bestNightHeader}>
              <Ionicons name="flame" size={20} color="#ff7b35" />
              <Text style={styles.bestNightTitle}>BEST NIGHT</Text>
            </View>
            <Text style={styles.bestNightValue}>{profileData.bestNight}</Text>
            <Text style={styles.bestNightSubtext}>Your most active night</Text>
          </LinearGradient>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff5555" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionIcons: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
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
    marginBottom: 12,
  },
  placeHistoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeHistoryLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  placeHistoryDate: {
    fontSize: 12,
    color: '#ff7b35',
    marginTop: 4,
  },
  placeHistoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 123, 53, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#ff7b35',
    fontWeight: '500',
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

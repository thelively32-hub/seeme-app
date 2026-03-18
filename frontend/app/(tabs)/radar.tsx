import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

interface UserStats {
  total_checkins: number;
  places_visited: number;
  current_streak: number;
  trending_visits: number;
}

interface RecentCheckin {
  id: string;
  place_name: string;
  place_type: string;
  checked_in_at: string;
}

// Animated radar ring
const RadarRing = ({ delay, size }: { delay: number; size: number }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animate = () => {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0.6);
      
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 3000,
          delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 3000,
          delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.radarRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

// Stat Card Component
const StatCard = ({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: string; 
  value: number; 
  label: string; 
  color: string;
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Recent Activity Item
const ActivityItem = ({ checkin }: { checkin: RecentCheckin }) => {
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityDot} />
      <View style={styles.activityContent}>
        <Text style={styles.activityPlace}>{checkin.place_name}</Text>
        <Text style={styles.activityMeta}>{checkin.place_type} • {timeAgo(checkin.checked_in_at)}</Text>
      </View>
    </View>
  );
};

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [statsData, checkinsData] = await Promise.all([
        api.getUserStats(),
        api.getCheckinHistory(5),
      ]);
      setStats(statsData);
      setRecentCheckins(checkinsData);
    } catch (e) {
      console.error('Error loading radar data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Radar</Text>
          <Text style={styles.headerSubtitle}>Track your social presence</Text>
        </View>

        {/* Radar Animation */}
        <View style={styles.radarContainer}>
          <RadarRing delay={0} size={width * 0.7} />
          <RadarRing delay={1000} size={width * 0.7} />
          <RadarRing delay={2000} size={width * 0.7} />
          
          {/* Center icon */}
          <View style={styles.radarCenter}>
            <LinearGradient
              colors={COLORS.gradients.goldButton as [string, string, string]}
              style={styles.radarCenterGradient}
            >
              <Ionicons name="radio" size={32} color={COLORS.text.dark} />
            </LinearGradient>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold.primary} />
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard 
                icon="location" 
                value={stats?.total_checkins || 0} 
                label="Check-ins" 
                color={COLORS.gold.primary}
              />
              <StatCard 
                icon="map" 
                value={stats?.places_visited || 0} 
                label="Places" 
                color="#4CAF50"
              />
              <StatCard 
                icon="flame" 
                value={stats?.current_streak || 0} 
                label="Streak" 
                color="#FF5722"
              />
              <StatCard 
                icon="trending-up" 
                value={stats?.trending_visits || 0} 
                label="Trending" 
                color="#E91E63"
              />
            </View>

            {/* Recent Activity */}
            <View style={styles.activitySection}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentCheckins.length === 0 ? (
                <View style={styles.noActivity}>
                  <Ionicons name="time-outline" size={40} color={COLORS.text.muted} />
                  <Text style={styles.noActivityText}>No recent check-ins</Text>
                  <Text style={styles.noActivitySubtext}>Start exploring to build your history</Text>
                </View>
              ) : (
                <View style={styles.activityList}>
                  {recentCheckins.map((checkin) => (
                    <ActivityItem key={checkin.id} checkin={checkin} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  radarContainer: {
    height: width * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.gold.primary,
  },
  radarCenter: {
    position: 'absolute',
  },
  radarCenterGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  activitySection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  activityList: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold.primary,
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityPlace: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  activityMeta: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  noActivity: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  noActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  noActivitySubtext: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 4,
  },
});

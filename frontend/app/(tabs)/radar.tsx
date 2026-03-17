import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import useLocation from '../../src/hooks/useLocation';

const { width } = Dimensions.get('window');

interface NearbyStats {
  total: number;
  hot: number;
  active: number;
  chill: number;
}

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<NearbyStats>({ total: 0, hot: 0, active: 0, chill: 0 });
  const [loading, setLoading] = useState(true);
  const { getCurrentLocation } = useLocation();
  
  // Animation for radar sweep
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Radar sweep animation
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        const places = await api.getNearbyPlaces(
          location.latitude,
          location.longitude,
          2000,
          25
        );
        
        const hot = places.filter((p: any) => p.activity_level === 'trending' || p.activity_level === 'high').length;
        const active = places.filter((p: any) => p.activity_level === 'medium').length;
        const chill = places.filter((p: any) => p.activity_level === 'low' || p.activity_level === 'none').length;
        
        setStats({ total: places.length, hot, active, chill });
      }
    } catch (e) {
      console.log('Error loading radar stats:', e);
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const sweepRotate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Social Radar</Text>
        <Text style={styles.subtitle}>Social energy around you</Text>

        {/* Radar visualization */}
        <View style={styles.radarContainer}>
          <View style={styles.radarRing3} />
          <View style={styles.radarRing2} />
          <View style={styles.radarRing1} />
          
          {/* Sweep animation */}
          <Animated.View 
            style={[
              styles.radarSweep,
              { transform: [{ rotate: sweepRotate }] }
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 123, 53, 0.4)', 'transparent']}
              style={styles.sweepGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Center with pulse */}
          <Animated.View style={[styles.radarCenter, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="radio" size={28} color="#ff7b35" />
          </Animated.View>
        </View>

        {/* Stats Cards */}
        {loading ? (
          <ActivityIndicator size="small" color="#ff7b35" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: '#ff5533' }]} />
              <Text style={styles.statValue}>{stats.hot}</Text>
              <Text style={styles.statLabel}>Hot Vibe</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: '#ffc107' }]} />
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statDot, { backgroundColor: '#4caf50' }]} />
              <Text style={styles.statValue}>{stats.chill}</Text>
              <Text style={styles.statLabel}>Chill</Text>
            </View>
          </View>
        )}

        {/* Total places */}
        <View style={styles.totalContainer}>
          <Ionicons name="business" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.totalText}>{stats.total} places nearby</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const radarSize = width - 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 30,
  },
  radarContainer: {
    width: radarSize,
    height: radarSize,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing1: {
    position: 'absolute',
    width: '35%',
    height: '35%',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.3)',
  },
  radarRing2: {
    position: 'absolute',
    width: '65%',
    height: '65%',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.2)',
  },
  radarRing3: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.1)',
  },
  radarSweep: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: 0,
    left: '25%',
    transformOrigin: 'center bottom',
  },
  sweepGradient: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 1000,
    borderTopRightRadius: 1000,
  },
  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 123, 53, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ff7b35',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  totalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});

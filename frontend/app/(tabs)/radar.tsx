import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function RadarScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Social Radar</Text>
        <Text style={styles.subtitle}>Social energy around you</Text>

        {/* Radar visualization placeholder */}
        <View style={styles.radarContainer}>
          <View style={styles.radarRing3} />
          <View style={styles.radarRing2} />
          <View style={styles.radarRing1} />
          <View style={styles.radarCenter}>
            <Ionicons name="radio" size={32} color="#ff7b35" />
          </View>
          
          {/* Sample blips */}
          <View style={[styles.blip, { top: '25%', left: '30%' }]}>
            <View style={[styles.blipDot, { backgroundColor: '#ff5533' }]} />
          </View>
          <View style={[styles.blip, { top: '35%', right: '25%' }]}>
            <View style={[styles.blipDot, { backgroundColor: '#ffc107' }]} />
          </View>
          <View style={[styles.blip, { bottom: '30%', left: '40%' }]}>
            <View style={[styles.blipDot, { backgroundColor: '#4caf50' }]} />
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ff5533' }]} />
            <Text style={styles.legendText}>Hot Vibe</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ffc107' }]} />
            <Text style={styles.legendText}>Active</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
            <Text style={styles.legendText}>Chill</Text>
          </View>
        </View>

        <Text style={styles.premiumHint}>
          Upgrade to SEE ME LIVE for real-time radar updates
        </Text>
      </View>
    </LinearGradient>
  );
}

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
    marginBottom: 40,
  },
  radarContainer: {
    width: width - 80,
    height: width - 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing1: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.3)',
  },
  radarRing2: {
    position: 'absolute',
    width: '70%',
    height: '70%',
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
  radarCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 123, 53, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ff7b35',
  },
  blip: {
    position: 'absolute',
  },
  blipDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 40,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  premiumHint: {
    fontSize: 14,
    color: '#ff7b35',
    marginTop: 40,
    textAlign: 'center',
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import useLocation from '../../src/hooks/useLocation';

const { width } = Dimensions.get('window');

// Activity refresh interval (30 seconds)
const REFRESH_INTERVAL = 30000;

interface Place {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: string;
  latitude: number;
  longitude: number;
  activity_level: string;
  activity_label: string;
  is_trending: boolean;
  activity_updated_at: string;
}

// Activity level colors
const getActivityColors = (level: string): { bg: string; bar: string[]; text: string } => {
  switch (level) {
    case 'trending':
      return {
        bg: 'rgba(255, 85, 51, 0.15)',
        bar: ['#ff5533', '#ff7b35'],
        text: '#ff5533'
      };
    case 'high':
      return {
        bg: 'rgba(255, 152, 0, 0.15)',
        bar: ['#ff9800', '#ffb74d'],
        text: '#ff9800'
      };
    case 'medium':
      return {
        bg: 'rgba(255, 193, 7, 0.15)',
        bar: ['#ffc107', '#ffeb3b'],
        text: '#ffc107'
      };
    case 'low':
      return {
        bg: 'rgba(76, 175, 80, 0.15)',
        bar: ['#4caf50', '#81c784'],
        text: '#4caf50'
      };
    default: // none
      return {
        bg: 'rgba(102, 102, 102, 0.15)',
        bar: ['#666666', '#888888'],
        text: '#888888'
      };
  }
};

// Activity bar width percentage
const getActivityBarWidth = (level: string): string => {
  switch (level) {
    case 'trending': return '100%';
    case 'high': return '75%';
    case 'medium': return '50%';
    case 'low': return '25%';
    default: return '10%';
  }
};

// Animated trending indicator
const TrendingBadge = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.trendingBadge, { transform: [{ scale: pulseAnim }] }]}>
      <Text style={styles.trendingEmoji}>🔥</Text>
    </Animated.View>
  );
};

const PlaceCard = ({ 
  place, 
  onCheckIn,
  isCheckingIn,
}: { 
  place: Place; 
  onCheckIn: (place: Place) => void;
  isCheckingIn: boolean;
}) => {
  const colors = getActivityColors(place.activity_level);
  const barWidth = getActivityBarWidth(place.activity_level);

  return (
    <TouchableOpacity style={styles.placeCard} activeOpacity={0.85}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.placeCardGradient}
      >
        {/* Header */}
        <View style={styles.placeHeader}>
          <View style={styles.placeInfo}>
            <View style={styles.placeNameRow}>
              <Text style={styles.placeName}>{place.name}</Text>
              {place.is_trending && <TrendingBadge />}
            </View>
            <Text style={styles.placeType}>{place.type} • {place.distance}</Text>
          </View>
        </View>

        {/* Activity Bar */}
        <View style={[styles.activityContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.activityBarBg}>
            <LinearGradient
              colors={colors.bar}
              style={[styles.activityBarFill, { width: barWidth }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={[styles.activityLabel, { color: colors.text }]}>
            {place.activity_label}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.placeActions}>
          <TouchableOpacity 
            style={[styles.checkInButton, isCheckingIn && styles.checkInButtonDisabled]}
            onPress={() => onCheckIn(place)}
            disabled={isCheckingIn}
          >
            {isCheckingIn ? (
              <ActivityIndicator size="small" color="#ff7b35" />
            ) : (
              <>
                <Ionicons name="location" size={18} color="#ff7b35" />
                <Text style={styles.checkInText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Check-in error modal component
const CheckInErrorModal = ({
  visible,
  message,
  onRetry,
  onClose,
}: {
  visible: boolean;
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalIcon}>
          <Ionicons name="location-outline" size={48} color="#ff7b35" />
        </View>
        <Text style={styles.modalTitle}>Can't check in yet</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [checkingInPlaceId, setCheckingInPlaceId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string; placeId: string | null }>({
    visible: false,
    message: '',
    placeId: null,
  });
  
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const { getCurrentLocation, permissionGranted, requestPermission, loading: locationLoading } = useLocation();

  const filters = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'trending', label: 'Trending', icon: 'flame' },
    { id: 'Nightclub', label: 'Clubs', icon: 'musical-notes' },
    { id: 'Bar', label: 'Bars', icon: 'wine' },
    { id: 'Lounge', label: 'Lounges', icon: 'cafe' },
  ];

  const loadPlaces = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      
      let params: any = {};
      if (selectedFilter === 'trending') {
        params.trending = true;
      } else if (selectedFilter !== 'all') {
        params.type = selectedFilter;
      }
      
      const data = await api.getPlaces(params.type, params.trending, 20);
      setPlaces(data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error loading places:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  // Initial load
  useEffect(() => {
    loadPlaces(true);
  }, [selectedFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      loadPlaces(false);
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [loadPlaces]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlaces(false);
  };

  const handleCheckIn = async (place: Place) => {
    setCheckingInPlaceId(place.id);
    
    try {
      // Step 1: Get current location
      const location = await getCurrentLocation();
      
      if (!location) {
        // Location failed - show friendly error
        setErrorModal({
          visible: true,
          message: "We need your location to verify check-in. Please enable GPS and try again.",
          placeId: place.id,
        });
        setCheckingInPlaceId(null);
        return;
      }

      // Step 2: Check for mocked location
      if (location.isMocked) {
        setErrorModal({
          visible: true,
          message: "Mock location detected. Please disable mock locations to check in.",
          placeId: place.id,
        });
        setCheckingInPlaceId(null);
        return;
      }

      // Step 3: Attempt check-in with location data
      await api.checkIn(place.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        isMocked: location.isMocked,
      });

      // Success!
      Alert.alert(
        '✓ Checked In!',
        `You're now at ${place.name}`,
        [{ text: 'OK' }]
      );
      
      loadPlaces(false); // Refresh to update activity
      
    } catch (e: any) {
      // Handle location validation errors from backend
      let errorMessage = "Could not check in. Please try again.";
      
      if (e.message) {
        try {
          const parsed = JSON.parse(e.message);
          if (parsed.message) {
            errorMessage = parsed.message;
          }
        } catch {
          errorMessage = e.message;
        }
      }
      
      // Check if it's a location error
      if (errorMessage.includes("away") || errorMessage.includes("close") || errorMessage.includes("distance")) {
        setErrorModal({
          visible: true,
          message: `You're not close enough to check in 📍\n\nMove closer to ${place.name} to activate check-in.`,
          placeId: place.id,
        });
      } else if (errorMessage.includes("accuracy") || errorMessage.includes("GPS") || errorMessage.includes("signal")) {
        setErrorModal({
          visible: true,
          message: "GPS signal too weak 📡\n\nMove to an open area for better GPS accuracy and try again.",
          placeId: place.id,
        });
      } else {
        Alert.alert('Check-in Failed', errorMessage);
      }
    } finally {
      setCheckingInPlaceId(null);
    }
  };

  const handleRetryCheckIn = async () => {
    const placeId = errorModal.placeId;
    setErrorModal({ visible: false, message: '', placeId: null });
    
    if (placeId) {
      const place = places.find(p => p.id === placeId);
      if (place) {
        // Small delay before retry
        setTimeout(() => handleCheckIn(place), 500);
      }
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity style={styles.mapButton}>
          <Ionicons name="map" size={24} color="#ff7b35" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
        <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
        <Text style={styles.searchPlaceholder}>Search places...</Text>
      </TouchableOpacity>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={selectedFilter === filter.id ? '#fff' : 'rgba(255,255,255,0.6)'}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.id && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Live Activity Header */}
      <View style={styles.liveHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live Activity</Text>
        </View>
        <Text style={styles.lastUpdateText}>{formatLastUpdate()}</Text>
      </View>

      {/* Places List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7b35" />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try a different filter</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.placesList}
          contentContainerStyle={styles.placesContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff7b35"
            />
          }
        >
          {places.map((place) => (
            <PlaceCard 
              key={place.id} 
              place={place}
              onCheckIn={handleCheckIn}
              isCheckingIn={checkingInPlaceId === place.id}
            />
          ))}
          
          {/* Footer */}
          <View style={styles.listFooter}>
            <Text style={styles.footerText}>
              Activity updates every 30 seconds
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Check-in Error Modal */}
      <CheckInErrorModal
        visible={errorModal.visible}
        message={errorModal.message}
        onRetry={handleRetryCheckIn}
        onClose={() => setErrorModal({ visible: false, message: '', placeId: null })}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
  },
  filtersContainer: {
    marginTop: 16,
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#ff7b35',
  },
  filterText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff5533',
    marginRight: 8,
  },
  liveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  lastUpdateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
  placesList: {
    flex: 1,
  },
  placesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  placeCard: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeCardGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  trendingBadge: {
    marginLeft: 4,
  },
  trendingEmoji: {
    fontSize: 16,
  },
  placeType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  activityContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  activityBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  activityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 123, 53, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  checkInButtonDisabled: {
    opacity: 0.7,
  },
  checkInText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff7b35',
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a0a2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 123, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff7b35',
    paddingVertical: 14,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
});

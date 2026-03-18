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
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import useLocation from '../../src/hooks/useLocation';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');
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

const getActivityColors = (level: string) => {
  switch (level) {
    case 'trending':
      return { bg: 'rgba(255, 85, 51, 0.12)', bar: ['#ff5533', '#ff7b35'], text: '#ff5533' };
    case 'high':
      return { bg: 'rgba(255, 152, 0, 0.12)', bar: ['#ff9800', '#ffb74d'], text: '#ff9800' };
    case 'medium':
      return { bg: 'rgba(255, 193, 7, 0.12)', bar: ['#ffc107', '#ffeb3b'], text: '#ffc107' };
    case 'low':
      return { bg: 'rgba(76, 175, 80, 0.12)', bar: ['#4caf50', '#81c784'], text: '#4caf50' };
    default:
      return { bg: 'rgba(102, 102, 102, 0.12)', bar: ['#666666', '#888888'], text: '#888888' };
  }
};

const getActivityBarWidth = (level: string): string => {
  switch (level) {
    case 'trending': return '100%';
    case 'high': return '75%';
    case 'medium': return '50%';
    case 'low': return '25%';
    default: return '10%';
  }
};

// Trending Badge Component
const TrendingBadge = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.trendingBadge, { transform: [{ scale: pulseAnim }] }]}>
      <Text style={styles.trendingEmoji}>🔥</Text>
    </Animated.View>
  );
};

// Place Card Component
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
      <View style={styles.placeCardInner}>
        {/* Header */}
        <View style={styles.placeHeader}>
          <View style={styles.placeInfo}>
            <View style={styles.placeNameRow}>
              <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
              {place.is_trending && <TrendingBadge />}
            </View>
            <Text style={styles.placeType}>{place.type} • {place.distance}</Text>
          </View>
        </View>

        {/* Activity Bar */}
        <View style={[styles.activityContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.activityBarBg}>
            <LinearGradient
              colors={colors.bar as [string, string]}
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
              <ActivityIndicator size="small" color={COLORS.gold.primary} />
            ) : (
              <>
                <Ionicons name="location" size={18} color={COLORS.gold.primary} />
                <Text style={styles.checkInText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Check-in Modal
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
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalIcon}>
          <Ionicons name="location-outline" size={48} color={COLORS.gold.primary} />
        </View>
        <Text style={styles.modalTitle}>Can't check in yet</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <LinearGradient colors={COLORS.gradients.goldButton as [string, string, string]} style={styles.retryButtonGradient}>
              <Ionicons name="refresh" size={20} color={COLORS.text.dark} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [presence, setPresence] = useState<{ is_present: boolean; current_place_name: string | null; status_message: string | null } | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string; placeId: string | null }>({
    visible: false,
    message: '',
    placeId: null,
  });
  
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const { getCurrentLocation, permissionGranted, requestPermission } = useLocation();

  // Load presence status
  const loadPresence = async () => {
    try {
      const data = await api.getMyPresence();
      setPresence(data);
    } catch (e) {
      // User might not be logged in
      console.log('Could not load presence:', e);
    }
  };

  const filters = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'trending', label: 'Hot', icon: 'flame' },
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

  useEffect(() => {
    loadPlaces(true);
    loadPresence();
  }, [selectedFilter]);

  useEffect(() => {
    refreshTimer.current = setInterval(() => loadPlaces(false), REFRESH_INTERVAL);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [loadPlaces]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlaces(false);
  };

  const handleCheckIn = async (place: Place) => {
    setCheckingInPlaceId(place.id);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setErrorModal({
          visible: true,
          message: "We need your location to verify check-in. Please enable GPS and try again.",
          placeId: place.id,
        });
        setCheckingInPlaceId(null);
        return;
      }
      if (location.isMocked) {
        setErrorModal({
          visible: true,
          message: "Mock location detected. Please disable mock locations to check in.",
          placeId: place.id,
        });
        setCheckingInPlaceId(null);
        return;
      }
      await api.checkIn(place.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        isMocked: location.isMocked,
      });
      Alert.alert("You're part of the vibe ✓", `Now at ${place.name}`, [{ text: 'OK' }]);
      loadPlaces(false);
      loadPresence(); // Update presence indicator
    } catch (e: any) {
      let errorMessage = "Could not check in. Please try again.";
      if (e.message) {
        try {
          const parsed = JSON.parse(e.message);
          if (parsed.message) errorMessage = parsed.message;
        } catch {
          errorMessage = e.message;
        }
      }
      if (errorMessage.includes("away") || errorMessage.includes("close") || errorMessage.includes("distance")) {
        setErrorModal({
          visible: true,
          message: `You're not close enough to check in 📍\n\nMove closer to ${place.name} to activate check-in.`,
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
      if (place) setTimeout(() => handleCheckIn(place), 500);
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const filteredPlaces = places.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSubtitle}>Discover the vibe around you</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor={COLORS.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Presence Banner */}
      {presence && (
        <View style={[styles.presenceBanner, presence.is_present ? styles.presenceBannerActive : styles.presenceBannerInactive]}>
          <View style={[styles.presenceDot, presence.is_present ? styles.presenceDotActive : styles.presenceDotInactive]} />
          <View style={styles.presenceInfo}>
            <Text style={styles.presenceLabel}>
              {presence.is_present ? 'Estas en' : 'No estas en ningun lugar'}
            </Text>
            {presence.is_present && presence.current_place_name && (
              <Text style={styles.presencePlace}>{presence.current_place_name}</Text>
            )}
            {presence.status_message && (
              <Text style={styles.presenceStatus}>{presence.status_message}</Text>
            )}
          </View>
          {presence.is_present && (
            <TouchableOpacity 
              style={styles.checkoutButton}
              onPress={async () => {
                try {
                  await api.checkOut();
                  loadPresence();
                  loadPlaces(false);
                  Alert.alert('Checkout', 'Has salido del lugar');
                } catch (e) {
                  console.error('Checkout error:', e);
                }
              }}
            >
              <Text style={styles.checkoutText}>Salir</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
              color={selectedFilter === filter.id ? COLORS.text.dark : COLORS.text.tertiary}
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

      {/* Live Header */}
      <View style={styles.liveHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Social Energy</Text>
        </View>
        <Text style={styles.lastUpdateText}>{formatLastUpdate()}</Text>
      </View>

      {/* Places List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold.primary} />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try a different filter</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.placesList}
          contentContainerStyle={styles.placesContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold.primary} />
          }
        >
          {filteredPlaces.map((place) => (
            <PlaceCard 
              key={place.id} 
              place={place}
              onCheckIn={handleCheckIn}
              isCheckingIn={checkingInPlaceId === place.id}
            />
          ))}
          <View style={styles.listFooter}>
            <Text style={styles.footerText}>Social energy updates in real-time</Text>
          </View>
        </ScrollView>
      )}

      <CheckInErrorModal
        visible={errorModal.visible}
        message={errorModal.message}
        onRetry={handleRetryCheckIn}
        onClose={() => setErrorModal({ visible: false, message: '', placeId: null })}
      />

      {/* QR Scanner FAB */}
      <TouchableOpacity
        style={[styles.qrFab, { bottom: insets.bottom + 100 }]}
        onPress={() => require('expo-router').router.push('/scanner')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={COLORS.gradients.goldButton as [string, string, string]}
          style={styles.qrFabGradient}
        >
          <Ionicons name="qr-code" size={24} color={COLORS.text.dark} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background.card,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  filterChipActive: {
    backgroundColor: COLORS.gold.primary,
    borderColor: COLORS.gold.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.text.dark,
    fontWeight: '600',
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
    backgroundColor: COLORS.live.red,
    marginRight: 8,
  },
  liveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  lastUpdateText: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text.secondary,
    marginTop: 12,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    marginTop: 8,
  },
  placesList: {
    flex: 1,
  },
  placesContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  placeCard: {
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  placeCardInner: {
    padding: 16,
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
    color: COLORS.text.primary,
    flex: 1,
  },
  trendingBadge: {
    marginLeft: 4,
  },
  trendingEmoji: {
    fontSize: 16,
  },
  placeType: {
    fontSize: 14,
    color: COLORS.text.tertiary,
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
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
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
    color: COLORS.gold.primary,
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
  },
  qrFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qrFabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  // Presence Banner Styles
  presenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  presenceBannerActive: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    borderColor: COLORS.border.gold,
  },
  presenceBannerInactive: {
    backgroundColor: COLORS.background.card,
    borderColor: COLORS.border.light,
  },
  presenceDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  presenceDotActive: {
    backgroundColor: COLORS.gold.primary,
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  presenceDotInactive: {
    backgroundColor: COLORS.text.muted,
  },
  presenceInfo: {
    flex: 1,
  },
  presenceLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presencePlace: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 2,
  },
  presenceStatus: {
    fontSize: 13,
    color: COLORS.gold.primary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  checkoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  checkoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});

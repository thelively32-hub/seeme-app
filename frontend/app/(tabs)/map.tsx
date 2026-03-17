import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import useLocation from '../../src/hooks/useLocation';

const { width, height } = Dimensions.get('window');

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  activity_level: string;
  activity_label: string;
  is_trending: boolean;
  distance?: string;
  google_place_id?: string;
  source: string;
}

// Get marker color based on activity level
const getMarkerColor = (level: string): string => {
  switch (level) {
    case 'trending': return '#ff5533';
    case 'high': return '#ff9800';
    case 'medium': return '#ffc107';
    case 'low': return '#4caf50';
    default: return '#888888';
  }
};

// Activity level colors for UI
const getActivityColors = (level: string): { bg: string; bar: string[]; text: string } => {
  switch (level) {
    case 'trending':
      return { bg: 'rgba(255, 85, 51, 0.15)', bar: ['#ff5533', '#ff7b35'], text: '#ff5533' };
    case 'high':
      return { bg: 'rgba(255, 152, 0, 0.15)', bar: ['#ff9800', '#ffb74d'], text: '#ff9800' };
    case 'medium':
      return { bg: 'rgba(255, 193, 7, 0.15)', bar: ['#ffc107', '#ffeb3b'], text: '#ffc107' };
    case 'low':
      return { bg: 'rgba(76, 175, 80, 0.15)', bar: ['#4caf50', '#81c784'], text: '#4caf50' };
    default:
      return { bg: 'rgba(102, 102, 102, 0.15)', bar: ['#666666', '#888888'], text: '#888888' };
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
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Text style={{ fontSize: 16 }}>🔥</Text>
    </Animated.View>
  );
};

// Place Card Component for Map View
const PlaceMapCard = ({ 
  place, 
  onPress,
}: { 
  place: NearbyPlace; 
  onPress: () => void;
}) => {
  const colors = getActivityColors(place.activity_level);

  return (
    <TouchableOpacity 
      style={styles.placeMapCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Activity indicator dot */}
      <View style={[styles.activityDot, { backgroundColor: getMarkerColor(place.activity_level) }]}>
        {place.is_trending && <Ionicons name="flame" size={12} color="#fff" />}
      </View>
      
      <View style={styles.placeMapInfo}>
        <View style={styles.placeMapHeader}>
          <Text style={styles.placeMapName} numberOfLines={1}>{place.name}</Text>
          {place.is_trending && <TrendingBadge />}
        </View>
        <Text style={styles.placeMapType}>{place.type} • {place.distance}</Text>
        <Text style={[styles.placeMapActivity, { color: colors.text }]}>
          {place.activity_label}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );
};

// Place Detail Modal
const PlaceDetailModal = ({
  visible,
  place,
  onCheckIn,
  onClose,
  checkingIn,
}: {
  visible: boolean;
  place: NearbyPlace | null;
  onCheckIn: () => void;
  onClose: () => void;
  checkingIn: boolean;
}) => {
  if (!place) return null;
  
  const colors = getActivityColors(place.activity_level);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close button */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* Place header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalActivityDot, { backgroundColor: getMarkerColor(place.activity_level) }]}>
              {place.is_trending ? (
                <Ionicons name="flame" size={24} color="#fff" />
              ) : (
                <Ionicons name="location" size={24} color="#fff" />
              )}
            </View>
            <View style={styles.modalTitleContainer}>
              <View style={styles.modalNameRow}>
                <Text style={styles.modalPlaceName}>{place.name}</Text>
                {place.is_trending && <TrendingBadge />}
              </View>
              <Text style={styles.modalPlaceType}>{place.type} • {place.distance}</Text>
            </View>
          </View>

          {/* Activity Bar */}
          <View style={[styles.activityContainer, { backgroundColor: colors.bg }]}>
            <View style={styles.activityBarBg}>
              <LinearGradient
                colors={colors.bar}
                style={[styles.activityBarFill, { width: getActivityBarWidth(place.activity_level) }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={[styles.activityLabel, { color: colors.text }]}>
              {place.activity_label}
            </Text>
          </View>

          {/* Address if available */}
          {place.address && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.addressText}>{place.address}</Text>
            </View>
          )}

          {/* Source indicator */}
          <View style={styles.sourceContainer}>
            <Ionicons 
              name={place.source === 'google' ? 'logo-google' : 'business'} 
              size={14} 
              color="rgba(255,255,255,0.3)" 
            />
            <Text style={styles.sourceText}>
              {place.source === 'google' ? 'Google Places' : 'SEE ME verified'}
            </Text>
          </View>

          {/* Check-in Button */}
          <TouchableOpacity 
            style={[styles.checkInButton, checkingIn && styles.checkInButtonDisabled]}
            onPress={onCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.checkInButtonText}>Check In Here</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const { getCurrentLocation, permissionGranted, requestPermission } = useLocation();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load user location and nearby places
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // Get current location
      const location = await getCurrentLocation();
      
      if (!location) {
        // Try requesting permission
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'Location Required',
            'Please enable location services to see nearby places.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          setRefreshing(false);
          return;
        }
        // Try again after permission
        const retryLocation = await getCurrentLocation();
        if (!retryLocation) {
          setLoading(false);
          setRefreshing(false);
          return;
        }
        setUserLocation({ latitude: retryLocation.latitude, longitude: retryLocation.longitude });
        
        // Fetch nearby places from API
        const nearbyPlaces = await api.getNearbyPlaces(
          retryLocation.latitude,
          retryLocation.longitude,
          2000, // 2km radius
          25    // max 25 places
        );
        setPlaces(nearbyPlaces);
      } else {
        setUserLocation({ latitude: location.latitude, longitude: location.longitude });
        
        // Fetch nearby places from API
        const nearbyPlaces = await api.getNearbyPlaces(
          location.latitude,
          location.longitude,
          2000, // 2km radius
          25    // max 25 places
        );
        setPlaces(nearbyPlaces);
      }
    } catch (e) {
      console.error('Error loading map data:', e);
      Alert.alert('Error', 'Could not load nearby places. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentLocation, requestPermission]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Handle place selection
  const handlePlacePress = (place: NearbyPlace) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!selectedPlace || !userLocation) return;
    
    setCheckingIn(true);
    try {
      const location = await getCurrentLocation();
      
      if (!location) {
        Alert.alert('Error', 'Could not get your location. Please try again.');
        return;
      }

      if (location.isMocked) {
        Alert.alert('Error', 'Mock location detected. Please disable mock locations to check in.');
        return;
      }

      await api.checkIn(selectedPlace.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        isMocked: location.isMocked,
      });

      Alert.alert(
        '✓ Checked In!',
        `You're now at ${selectedPlace.name}`,
        [{ text: 'OK' }]
      );
      
      // Refresh places to update activity
      loadData(false);
      setModalVisible(false);
      setSelectedPlace(null);
      
    } catch (e: any) {
      let errorMessage = 'Could not check in. Please try again.';
      
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
      
      Alert.alert('Check-in Failed', errorMessage);
    } finally {
      setCheckingIn(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  if (loading && !places.length) {
    return (
      <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#ff7b35" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Sort places by activity level
  const sortedPlaces = [...places].sort((a, b) => {
    const order = { trending: 0, high: 1, medium: 2, low: 3, none: 4 };
    return (order[a.activity_level as keyof typeof order] || 5) - (order[b.activity_level as keyof typeof order] || 5);
  });

  // Count places by activity
  const activityCounts = {
    trending: places.filter(p => p.activity_level === 'trending').length,
    high: places.filter(p => p.activity_level === 'high').length,
    medium: places.filter(p => p.activity_level === 'medium').length,
    low: places.filter(p => p.activity_level === 'low').length,
  };

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Nearby</Text>
          <Text style={styles.headerSubtitle}>
            {places.length} places within 2km
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => loadData(true)}>
          <Ionicons name="refresh" size={22} color="#ff7b35" />
        </TouchableOpacity>
      </View>

      {/* Activity Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#ff5533' }]} />
          <Text style={styles.summaryText}>{activityCounts.trending} Trending</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#ff9800' }]} />
          <Text style={styles.summaryText}>{activityCounts.high} High</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#ffc107' }]} />
          <Text style={styles.summaryText}>{activityCounts.medium} Medium</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: '#4caf50' }]} />
          <Text style={styles.summaryText}>{activityCounts.low} Low</Text>
        </View>
      </View>

      {/* Places List */}
      {places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No places found nearby</Text>
          <Text style={styles.emptySubtitle}>Try refreshing or check back later</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => loadData(true)}>
            <Text style={styles.emptyButtonText}>Refresh</Text>
          </TouchableOpacity>
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
          {/* Section: Trending & High Activity */}
          {sortedPlaces.filter(p => p.activity_level === 'trending' || p.activity_level === 'high').length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hot Right Now 🔥</Text>
              {sortedPlaces
                .filter(p => p.activity_level === 'trending' || p.activity_level === 'high')
                .map((place) => (
                  <PlaceMapCard 
                    key={place.id} 
                    place={place}
                    onPress={() => handlePlacePress(place)}
                  />
                ))}
            </View>
          )}

          {/* Section: Other Places */}
          {sortedPlaces.filter(p => p.activity_level !== 'trending' && p.activity_level !== 'high').length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other Places</Text>
              {sortedPlaces
                .filter(p => p.activity_level !== 'trending' && p.activity_level !== 'high')
                .map((place) => (
                  <PlaceMapCard 
                    key={place.id} 
                    place={place}
                    onPress={() => handlePlacePress(place)}
                  />
                ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tap a place to check in
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Place Detail Modal */}
      <PlaceDetailModal
        visible={modalVisible}
        place={selectedPlace}
        onCheckIn={handleCheckIn}
        onClose={() => {
          setModalVisible(false);
          setSelectedPlace(null);
        }}
        checkingIn={checkingIn}
      />
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
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 14,
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
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  placesList: {
    flex: 1,
  },
  placesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  placeMapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activityDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeMapInfo: {
    flex: 1,
  },
  placeMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeMapName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  placeMapType: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  placeMapActivity: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
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
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ff7b35',
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a0a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalActivityDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalPlaceName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  modalPlaceType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  activityContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    flex: 1,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  sourceText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ff7b35',
    paddingVertical: 16,
    borderRadius: 25,
  },
  checkInButtonDisabled: {
    opacity: 0.7,
  },
  checkInButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});

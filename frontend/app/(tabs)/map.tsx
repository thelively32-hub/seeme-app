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

// Check if we're on native platform for maps
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Conditionally import native map components
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (isNative) {
  try {
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default;
    Marker = RNMaps.Marker;
    PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

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

// Pin colors by activity level
const getPinColor = (level: string): string => {
  switch (level) {
    case 'trending': return '#ff5533';
    case 'high': return '#ff9800';
    case 'medium': return '#ffc107';
    case 'low': return '#4caf50';
    default: return '#888888';
  }
};

// Activity colors for UI
const getActivityColors = (level: string) => {
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

// Animated Pin Component for trending places
const AnimatedPin = ({ 
  color, 
  isTrending, 
  isSelected,
  size = 36,
}: { 
  color: string; 
  isTrending: boolean; 
  isSelected: boolean;
  size?: number;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isTrending) {
      // Subtle pulse animation for trending
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulse.start();
      glow.start();
      
      return () => {
        pulse.stop();
        glow.stop();
      };
    }
  }, [isTrending]);

  const pinSize = isSelected ? size + 8 : size;
  const borderWidth = isSelected ? 3 : 2;

  return (
    <View style={styles.pinWrapper}>
      {/* Glow effect for trending */}
      {isTrending && (
        <Animated.View 
          style={[
            styles.pinGlow, 
            { 
              backgroundColor: color,
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
              width: pinSize + 16,
              height: pinSize + 16,
              borderRadius: (pinSize + 16) / 2,
            }
          ]} 
        />
      )}
      
      <Animated.View 
        style={[
          styles.pinContainer,
          {
            backgroundColor: color,
            width: pinSize,
            height: pinSize,
            borderRadius: pinSize / 2,
            borderWidth,
            borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.8)',
            transform: isTrending ? [{ scale: pulseAnim }] : [],
          }
        ]}
      >
        {isTrending ? (
          <Ionicons name="flame" size={pinSize * 0.5} color="#fff" />
        ) : (
          <Ionicons name="location" size={pinSize * 0.45} color="#fff" />
        )}
      </Animated.View>
    </View>
  );
};

// Bottom Sheet Component
const PlaceBottomSheet = ({
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
  const slideAnim = useRef(new Animated.Value(300)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!place) return null;
  
  const colors = getActivityColors(place.activity_level);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.sheetOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.sheetContent,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Place header */}
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetActivityDot, { backgroundColor: getPinColor(place.activity_level) }]}>
                {place.is_trending ? (
                  <Ionicons name="flame" size={24} color="#fff" />
                ) : (
                  <Ionicons name="location" size={24} color="#fff" />
                )}
              </View>
              <View style={styles.sheetTitleContainer}>
                <View style={styles.sheetNameRow}>
                  <Text style={styles.sheetPlaceName} numberOfLines={1}>{place.name}</Text>
                  {place.is_trending && <Text style={styles.trendingEmoji}>🔥</Text>}
                </View>
                <Text style={styles.sheetPlaceType}>{place.type} • {place.distance}</Text>
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

            {/* Address */}
            {place.address && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.addressText} numberOfLines={1}>{place.address}</Text>
              </View>
            )}

            {/* Check-in Button */}
            <TouchableOpacity 
              style={[styles.checkInBtn, checkingIn && styles.checkInBtnDisabled]}
              onPress={onCheckIn}
              disabled={checkingIn}
              activeOpacity={0.8}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="location" size={20} color="#fff" />
                  <Text style={styles.checkInBtnText}>Check In Here</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// Empty State Overlay
const EmptyOverlay = () => (
  <View style={styles.emptyOverlay}>
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>👀</Text>
      <Text style={styles.emptyTitle}>No social spots nearby yet</Text>
      <Text style={styles.emptySubtitle}>Be the first to discover this area!</Text>
    </View>
  </View>
);

// Web Fallback - List View
const WebListView = ({
  places,
  loading,
  refreshing,
  onRefresh,
  onPlacePress,
  insets,
}: {
  places: NearbyPlace[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPlacePress: (place: NearbyPlace) => void;
  insets: any;
}) => {
  const sortedPlaces = [...places].sort((a, b) => {
    const order = { trending: 0, high: 1, medium: 2, low: 3, none: 4 };
    return (order[a.activity_level as keyof typeof order] || 5) - (order[b.activity_level as keyof typeof order] || 5);
  });

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <View style={[styles.webHeader, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Nearby</Text>
          <Text style={styles.headerSubtitle}>{places.length} places within 2km</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color="#ff7b35" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7b35" />
          <Text style={styles.loadingText}>Finding places nearby...</Text>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👀</Text>
          <Text style={styles.emptyTitle}>No social spots nearby yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to discover this area!</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.webList}
          contentContainerStyle={styles.webListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff7b35" />
          }
        >
          {sortedPlaces.map((place) => (
            <TouchableOpacity 
              key={place.id} 
              style={styles.webCard}
              onPress={() => onPlacePress(place)}
              activeOpacity={0.8}
            >
              <View style={[styles.webCardDot, { backgroundColor: getPinColor(place.activity_level) }]}>
                {place.is_trending ? (
                  <Ionicons name="flame" size={14} color="#fff" />
                ) : (
                  <Ionicons name="location" size={14} color="#fff" />
                )}
              </View>
              <View style={styles.webCardInfo}>
                <View style={styles.webCardHeader}>
                  <Text style={styles.webCardName} numberOfLines={1}>{place.name}</Text>
                  {place.is_trending && <Text>🔥</Text>}
                </View>
                <Text style={styles.webCardType}>{place.type} • {place.distance}</Text>
                <Text style={[styles.webCardActivity, { color: getActivityColors(place.activity_level).text }]}>
                  {place.activity_label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </LinearGradient>
  );
};

// Main Map Screen Component
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [cachedPlaces, setCachedPlaces] = useState<NearbyPlace[]>([]); // Cache for fallback
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [initialRegionSet, setInitialRegionSet] = useState(false);
  
  const { getCurrentLocation, permissionGranted, requestPermission } = useLocation();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load data
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const location = await getCurrentLocation();
      
      if (!location) {
        const granted = await requestPermission();
        if (!granted) {
          // Use cached data if available
          if (cachedPlaces.length > 0) {
            setPlaces(cachedPlaces);
          }
          Alert.alert('Location Required', 'Please enable location to see nearby places.');
          setLoading(false);
          setRefreshing(false);
          return;
        }
        const retryLocation = await getCurrentLocation();
        if (retryLocation) {
          setUserLocation({ latitude: retryLocation.latitude, longitude: retryLocation.longitude });
          const nearbyPlaces = await api.getNearbyPlaces(retryLocation.latitude, retryLocation.longitude, 2000, 25);
          setPlaces(nearbyPlaces);
          setCachedPlaces(nearbyPlaces); // Cache for fallback
        }
      } else {
        setUserLocation({ latitude: location.latitude, longitude: location.longitude });
        try {
          const nearbyPlaces = await api.getNearbyPlaces(location.latitude, location.longitude, 2000, 25);
          setPlaces(nearbyPlaces);
          setCachedPlaces(nearbyPlaces); // Cache for fallback
        } catch (apiError) {
          console.error('API Error:', apiError);
          // Use cached data on API failure
          if (cachedPlaces.length > 0) {
            setPlaces(cachedPlaces);
          }
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
      // Use cached data on error
      if (cachedPlaces.length > 0) {
        setPlaces(cachedPlaces);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentLocation, requestPermission, cachedPlaces]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Center map on user location ONLY on first load
  useEffect(() => {
    if (userLocation && mapRef.current && mapReady && !initialRegionSet) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
      setInitialRegionSet(true);
    }
  }, [userLocation, mapReady, initialRegionSet]);

  // Handle marker press
  const handleMarkerPress = useCallback((place: NearbyPlace) => {
    setSelectedPlace(place);
    setSheetVisible(true);
    
    // Gently animate to selected place without resetting zoom
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: place.latitude - 0.003, // Offset to show bottom sheet
        longitude: place.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 400);
    }
  }, []);

  // Handle check-in with GPS validation (Phase 2)
  const handleCheckIn = useCallback(async () => {
    if (!selectedPlace) return;
    
    setCheckingIn(true);
    try {
      const location = await getCurrentLocation();
      
      if (!location) {
        Alert.alert('Error', 'Could not get your location. Please try again.');
        return;
      }

      if (location.isMocked) {
        Alert.alert('Error', 'Mock location detected. Please disable to check in.');
        return;
      }

      await api.checkIn(selectedPlace.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        isMocked: location.isMocked,
      });

      // Success feedback
      Alert.alert('Checked in successfully ✅', `You're now at ${selectedPlace.name}`);
      
      // Close sheet and refresh
      setSheetVisible(false);
      setSelectedPlace(null);
      loadData(false);
      
    } catch (e: any) {
      let errorMessage = 'Could not check in. Please try again.';
      
      if (e.message) {
        try {
          const parsed = JSON.parse(e.message);
          if (parsed.message) errorMessage = parsed.message;
        } catch {
          errorMessage = e.message;
        }
      }
      
      Alert.alert('Check-in Failed', errorMessage);
    } finally {
      setCheckingIn(false);
    }
  }, [selectedPlace, getCurrentLocation, loadData]);

  // Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Center on user
  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    }
  }, [userLocation]);

  // Initial region
  const initialRegion = useMemo(() => ({
    latitude: userLocation?.latitude || 40.7128,
    longitude: userLocation?.longitude || -74.0060,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  }), [userLocation]);

  // Web fallback
  if (!isNative || !MapView) {
    return (
      <>
        <WebListView
          places={places}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPlacePress={(place) => {
            setSelectedPlace(place);
            setSheetVisible(true);
          }}
          insets={insets}
        />
        <PlaceBottomSheet
          visible={sheetVisible}
          place={selectedPlace}
          onCheckIn={handleCheckIn}
          onClose={() => {
            setSheetVisible(false);
            setSelectedPlace(null);
          }}
          checkingIn={checkingIn}
        />
      </>
    );
  }

  // Loading state
  if (loading && !places.length) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ff7b35" />
        <Text style={styles.loadingText}>Finding places nearby...</Text>
      </View>
    );
  }

  // Native Map View
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => setMapReady(true)}
        customMapStyle={darkMapStyle}
        moveOnMarkerPress={false}
      >
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            onPress={() => handleMarkerPress(place)}
            tracksViewChanges={place.is_trending} // Only track for animated pins
          >
            <AnimatedPin
              color={getPinColor(place.activity_level)}
              isTrending={place.is_trending}
              isSelected={selectedPlace?.id === place.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <View style={[styles.mapHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Map</Text>
          <Text style={styles.headerCount}>{places.length} places</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#ff7b35" />
          ) : (
            <Ionicons name="refresh" size={22} color="#ff7b35" />
          )}
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { top: insets.top + 70 }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff5533' }]} />
          <Text style={styles.legendText}>Trending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff9800' }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ffc107' }]} />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
      </View>

      {/* Center button */}
      <TouchableOpacity 
        style={[styles.centerBtn, { bottom: insets.bottom + 100 }]}
        onPress={centerOnUser}
      >
        <Ionicons name="locate" size={24} color="#ff7b35" />
      </TouchableOpacity>

      {/* Empty state overlay */}
      {places.length === 0 && !loading && <EmptyOverlay />}

      {/* Bottom Sheet */}
      <PlaceBottomSheet
        visible={sheetVisible}
        place={selectedPlace}
        onCheckIn={handleCheckIn}
        onClose={() => {
          setSheetVisible(false);
          setSelectedPlace(null);
        }}
        checkingIn={checkingIn}
      />
    </View>
  );
}

// Dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 14,
  },
  // Pin styles
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  pinGlow: {
    position: 'absolute',
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Header
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(26, 10, 46, 0.95)',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Legend
  legend: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(26, 10, 46, 0.9)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  // Center button
  centerBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 10, 46, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.3)',
  },
  // Empty overlay
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  emptyCard: {
    backgroundColor: 'rgba(26, 10, 46, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#1a0a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetActivityDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sheetTitleContainer: {
    flex: 1,
  },
  sheetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetPlaceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  trendingEmoji: {
    fontSize: 16,
  },
  sheetPlaceType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  activityContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addressText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    flex: 1,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ff7b35',
    paddingVertical: 16,
    borderRadius: 25,
  },
  checkInBtnDisabled: {
    opacity: 0.7,
  },
  checkInBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  // Web fallback styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  webList: {
    flex: 1,
  },
  webListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  webCardDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  webCardInfo: {
    flex: 1,
  },
  webCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  webCardType: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  webCardActivity: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
});

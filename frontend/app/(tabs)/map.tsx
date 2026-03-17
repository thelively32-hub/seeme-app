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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  const { getCurrentLocation, permissionGranted, requestPermission } = useLocation();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['35%'], []);

  // Load user location and nearby places
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current location
      const location = await getCurrentLocation();
      
      if (!location) {
        // Try requesting permission
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'Location Required',
            'Please enable location services to see nearby places on the map.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
        // Try again after permission
        const retryLocation = await getCurrentLocation();
        if (!retryLocation) {
          setLoading(false);
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
    }
  }, [getCurrentLocation, requestPermission]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Center map on user location when it changes
  useEffect(() => {
    if (userLocation && mapRef.current && mapReady) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    }
  }, [userLocation, mapReady]);

  // Handle marker press
  const handleMarkerPress = (place: NearbyPlace) => {
    setSelectedPlace(place);
    bottomSheetRef.current?.expand();
    
    // Animate map to the selected place
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
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
      loadData();
      bottomSheetRef.current?.close();
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

  // Re-center map on user
  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  // Default region (fallback if no location)
  const initialRegion = userLocation ? {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  if (loading && !userLocation) {
    return (
      <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#ff7b35" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          onMapReady={() => setMapReady(true)}
          customMapStyle={mapDarkStyle}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              onPress={() => handleMarkerPress(place)}
            >
              <View style={[
                styles.markerContainer,
                { backgroundColor: getMarkerColor(place.activity_level) }
              ]}>
                <Ionicons 
                  name={place.activity_level === 'trending' ? 'flame' : 'location'} 
                  size={16} 
                  color="#fff" 
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>Map</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Ionicons name="refresh" size={22} color="#ff7b35" />
          </TouchableOpacity>
        </View>

        {/* Center on user button */}
        <TouchableOpacity 
          style={[styles.centerButton, { bottom: insets.bottom + 120 }]}
          onPress={centerOnUser}
        >
          <Ionicons name="locate" size={24} color="#ff7b35" />
        </TouchableOpacity>

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

        {/* Places count */}
        {places.length > 0 && (
          <View style={[styles.placesCount, { bottom: insets.bottom + 180 }]}>
            <Ionicons name="business" size={14} color="#fff" />
            <Text style={styles.placesCountText}>{places.length} places nearby</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet for Place Details */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        onChange={(index) => {
          if (index === -1) {
            setSelectedPlace(null);
          }
        }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          {selectedPlace && (
            <>
              {/* Place header */}
              <View style={styles.placeHeader}>
                <View style={styles.placeInfo}>
                  <View style={styles.placeNameRow}>
                    <Text style={styles.placeName}>{selectedPlace.name}</Text>
                    {selectedPlace.is_trending && (
                      <Text style={styles.trendingEmoji}>🔥</Text>
                    )}
                  </View>
                  <Text style={styles.placeType}>
                    {selectedPlace.type} • {selectedPlace.distance}
                  </Text>
                </View>
              </View>

              {/* Activity Bar */}
              <View style={[
                styles.activityContainer, 
                { backgroundColor: getActivityColors(selectedPlace.activity_level).bg }
              ]}>
                <View style={styles.activityBarBg}>
                  <LinearGradient
                    colors={getActivityColors(selectedPlace.activity_level).bar}
                    style={[styles.activityBarFill, { width: getActivityBarWidth(selectedPlace.activity_level) }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
                <Text style={[
                  styles.activityLabel, 
                  { color: getActivityColors(selectedPlace.activity_level).text }
                ]}>
                  {selectedPlace.activity_label}
                </Text>
              </View>

              {/* Address if available */}
              {selectedPlace.address && (
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.addressText}>{selectedPlace.address}</Text>
                </View>
              )}

              {/* Check-in Button */}
              <TouchableOpacity 
                style={[styles.checkInButton, checkingIn && styles.checkInButtonDisabled]}
                onPress={handleCheckIn}
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
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

// Dark map style for better visibility
const mapDarkStyle = [
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
  mapContainer: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(26, 10, 46, 0.9)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  centerButton: {
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
    fontSize: 12,
  },
  placesCount: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 10, 46, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placesCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  // Bottom Sheet styles
  bottomSheetBackground: {
    backgroundColor: '#1a0a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomSheetIndicator: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 40,
  },
  bottomSheetContent: {
    padding: 20,
    paddingTop: 8,
  },
  placeHeader: {
    marginBottom: 16,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  trendingEmoji: {
    fontSize: 18,
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
  addressContainer: {
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
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ff7b35',
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 8,
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

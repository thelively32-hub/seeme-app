import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = 120;
const BOTTOM_SHEET_MAX = height * 0.55;

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  activity_level: string;
  activity_label: string;
  is_trending: boolean;
  distance: string;
  checkin_count?: number;
}

interface PlaceUser {
  id: string;
  name: string;
  photo_url?: string;
  vibes?: string[];
  vibe_score?: number;
}

// Dark map style matching the mockup
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#FFD700' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000510' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
];

// Golden place marker with person count
const PlaceMarker = ({ place, onPress, isSelected }: {
  place: NearbyPlace;
  onPress: () => void;
  isSelected: boolean;
}) => {
  const count = place.checkin_count || 0;
  const isTrending = place.is_trending;

  return (
    <TouchableOpacity onPress={onPress} style={styles.markerContainer}>
      <View style={[
        styles.markerBubble,
        isSelected && styles.markerBubbleSelected,
        isTrending && styles.markerBubbleTrending,
      ]}>
        {count > 0 && (
          <Text style={styles.markerCount}>{count}</Text>
        )}
        <Ionicons
          name={count > 0 ? 'people' : 'location'}
          size={count > 0 ? 10 : 14}
          color={COLORS.text.dark}
        />
      </View>
      {isTrending && (
        <Text style={styles.trendingDot}>🔥</Text>
      )}
      <View style={[styles.markerTail, isSelected && styles.markerTailSelected]} />
    </TouchableOpacity>
  );
};

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_MIN)).current;

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [placeUsers, setPlaceUsers] = useState<PlaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Trending' | 'Clubs' | 'Bars' | 'Events'>('All');
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Get location and nearby places
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(coords);
      loadNearbyPlaces(coords.lat, coords.lng);
    })();
  }, []);

  const loadNearbyPlaces = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const data = await api.getNearbyPlaces(lat, lng);
      setPlaces(data || []);
    } catch (e) {
      console.error('Error loading nearby places:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlacePress = useCallback(async (place: NearbyPlace) => {
    setSelectedPlace(place);
    setPlaceUsers([]);

    // Expand sheet
    Animated.spring(sheetAnim, {
      toValue: BOTTOM_SHEET_MAX,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
    setSheetExpanded(true);

    // Center map on place
    mapRef.current?.animateToRegion({
      latitude: place.latitude - 0.002,
      longitude: place.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);

    // Load users at this place
    try {
      setLoadingUsers(true);
      const users = await api.getUsersAtPlace(place.id);
      setPlaceUsers(users?.users || []);
    } catch (e) {
      setPlaceUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const closeSheet = useCallback(() => {
    Animated.spring(sheetAnim, {
      toValue: BOTTOM_SHEET_MIN,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
    setSheetExpanded(false);
    setSelectedPlace(null);
  }, []);

  const filteredPlaces = places.filter(p => {
    if (filter === 'All') return true;
    if (filter === 'Trending') return p.is_trending;
    if (filter === 'Bars') return p.type?.toLowerCase().includes('bar');
    if (filter === 'Clubs') return p.type?.toLowerCase().includes('club') || p.type?.toLowerCase().includes('nightclub');
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Map */}
      {location && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={{
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
        >
          {filteredPlaces.map(place => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              onPress={() => handlePlacePress(place)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <PlaceMarker
                place={place}
                onPress={() => handlePlacePress(place)}
                isSelected={selectedPlace?.id === place.id}
              />
            </Marker>
          ))}

          {/* Radar pulse circle around user */}
          {location && (
            <Circle
              center={{ latitude: location.lat, longitude: location.lng }}
              radius={500}
              fillColor="rgba(255, 215, 0, 0.04)"
              strokeColor="rgba(255, 215, 0, 0.25)"
              strokeWidth={1}
            />
          )}
        </MapView>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.gold.primary} />
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SOCIAL RADAR</Text>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {(['All', 'Trending', 'Clubs', 'Bars', 'Events'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetAnim }]}>
        <View style={styles.sheetHandle} />

        {!selectedPlace ? (
          <View style={styles.sheetEmpty}>
            <Ionicons name="location-outline" size={28} color={COLORS.gold.primary} />
            <Text style={styles.sheetEmptyText}>
              {filteredPlaces.length} places nearby
            </Text>
            <Text style={styles.sheetEmptySubtext}>Tap a pin to explore</Text>
          </View>
        ) : (
          <>
            {/* Place header */}
            <View style={styles.placeHeader}>
              <View style={styles.placeInfo}>
                <View style={styles.placeNameRow}>
                  {selectedPlace.is_trending && (
                    <Text style={styles.trendingBadge}>🔥 Trending</Text>
                  )}
                  <Text style={styles.placeName}>{selectedPlace.name}</Text>
                </View>
                <Text style={styles.placeMeta}>
                  {selectedPlace.type} • {selectedPlace.distance} • {selectedPlace.activity_label}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={closeSheet}>
                <Ionicons name="close" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* People list */}
            {loadingUsers ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.gold.primary} />
            ) : placeUsers.length === 0 ? (
              <View style={styles.noUsers}>
                <Text style={styles.noUsersText}>No one checked in yet</Text>
                <Text style={styles.noUsersSubtext}>Be the first to join the vibe!</Text>
              </View>
            ) : (
              <FlatList
                data={placeUsers}
                keyExtractor={u => u.id}
                horizontal={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.userList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userCard}
                    onPress={() => router.push(`/user/${item.id}`)}
                  >
                    <View style={styles.userAvatarWrap}>
                      {item.photo_url ? (
                        <Image source={{ uri: item.photo_url }} style={styles.userAvatar} />
                      ) : (
                        <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                          <Ionicons name="person" size={20} color={COLORS.gold.primary} />
                        </View>
                      )}
                      <View style={styles.userAvatarGlow} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <View style={styles.vibeRow}>
                        {(item.vibes || []).slice(0, 2).map((v, i) => (
                          <View key={i} style={styles.vibePill}>
                            <Text style={styles.vibeText}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {item.vibe_score && (
                      <View style={styles.vibeScore}>
                        <Text style={styles.vibeScoreNum}>{item.vibe_score}</Text>
                        <Text style={styles.vibeScoreLabel}>vibe</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold.primary,
    letterSpacing: 3,
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterPillActive: {
    backgroundColor: COLORS.gold.primary,
    borderColor: COLORS.gold.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#000',
    fontWeight: '700',
  },

  // Markers
  markerContainer: { alignItems: 'center' },
  markerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.gold.primary,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  markerBubbleSelected: {
    backgroundColor: '#fff',
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  markerBubbleTrending: {
    shadowOpacity: 1,
  },
  markerCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  trendingDot: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 12,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.gold.primary,
    marginTop: -1,
  },
  markerTailSelected: {
    borderTopColor: '#fff',
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,10,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetEmpty: {
    alignItems: 'center',
    paddingTop: 8,
  },
  sheetEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 8,
  },
  sheetEmptySubtext: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 4,
  },

  // Place header in sheet
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  placeInfo: { flex: 1 },
  placeNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  trendingBadge: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeMeta: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Users list
  noUsers: { alignItems: 'center', paddingTop: 24 },
  noUsersText: { fontSize: 15, fontWeight: '600', color: COLORS.text.secondary },
  noUsersSubtext: { fontSize: 13, color: COLORS.text.muted, marginTop: 4 },
  userList: { paddingBottom: 16 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  userAvatarWrap: { position: 'relative' },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.gold.primary,
  },
  userAvatarPlaceholder: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  vibeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  vibePill: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vibeText: { fontSize: 11, color: COLORS.gold.primary, fontWeight: '500' },
  vibeScore: { alignItems: 'center', marginRight: 8 },
  vibeScoreNum: { fontSize: 18, fontWeight: '800', color: COLORS.gold.primary },
  vibeScoreLabel: { fontSize: 10, color: COLORS.text.muted },
});

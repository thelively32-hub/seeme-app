import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { router } from 'expo-router';
import api from '../../src/services/api';
import useLocation from '../../src/hooks/useLocation';
import COLORS from '../../src/theme/colors';

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

// Place Card Component
const PlaceCard = ({ 
  place, 
  onPress,
  onCheckIn,
  checkingIn,
}: { 
  place: NearbyPlace;
  onPress: () => void;
  onCheckIn: () => void;
  checkingIn: boolean;
}) => {
  const colors = getActivityColors(place.activity_level);
  
  return (
    <TouchableOpacity style={styles.placeCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.placeCardInner}>
        {/* Activity indicator dot */}
        <View style={[styles.activityDot, { backgroundColor: colors.text }]}>
          {place.is_trending && (
            <Text style={styles.trendingEmoji}>🔥</Text>
          )}
        </View>
        
        {/* Place info */}
        <View style={styles.placeInfo}>
          <View style={styles.placeHeader}>
            <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
            {place.source === 'google' && (
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
            )}
          </View>
          <Text style={styles.placeType}>{place.type} • {place.distance}</Text>
          <View style={[styles.activityBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.activityText, { color: colors.text }]}>
              {place.activity_label}
            </Text>
          </View>
        </View>
        
        {/* Check-in button */}
        <TouchableOpacity 
          style={styles.checkInBtn}
          onPress={onCheckIn}
          disabled={checkingIn}
        >
          {checkingIn ? (
            <ActivityIndicator size="small" color={COLORS.gold.primary} />
          ) : (
            <Ionicons name="location" size={20} color={COLORS.gold.primary} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Bottom Sheet for place details
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
  if (!place) return null;
  
  const colors = getActivityColors(place.activity_level);
  
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.bottomSheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />
          
          {/* Place Info */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>{place.name}</Text>
              {place.is_trending && <Text style={styles.trendingBadge}>🔥 Trending</Text>}
            </View>
            <Text style={styles.sheetSubtitle}>{place.type} • {place.distance}</Text>
            {place.address && (
              <Text style={styles.sheetAddress}>{place.address}</Text>
            )}
          </View>
          
          {/* Activity */}
          <View style={[styles.sheetActivity, { backgroundColor: colors.bg }]}>
            <View style={styles.activityBarBg}>
              <LinearGradient
                colors={colors.bar as [string, string]}
                style={[styles.activityBarFill, { width: getActivityBarWidth(place.activity_level) }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={[styles.sheetActivityText, { color: colors.text }]}>
              {place.activity_label}
            </Text>
          </View>
          
          {/* Check-in Button */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.seePeopleButton}
              onPress={() => {
                onClose();
                router.push(`/place/${place.id}?name=${encodeURIComponent(place.name)}`);
              }}
            >
              <Ionicons name="people" size={20} color={COLORS.gold.primary} />
              <Text style={styles.seePeopleText}>See People</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={onCheckIn}
              disabled={checkingIn}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.checkInButtonGradient}
              >
                {checkingIn ? (
                  <ActivityIndicator color={COLORS.text.dark} />
                ) : (
                  <>
                    <Ionicons name="location" size={20} color={COLORS.text.dark} />
                    <Text style={styles.checkInButtonText}>Check In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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
  const [sheetVisible, setSheetVisible] = useState(false);
  
  const { getCurrentLocation, requestPermission } = useLocation();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load places
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      let lat: number;
      let lng: number;
      
      const location = await getCurrentLocation();
      
      if (location) {
        lat = location.latitude;
        lng = location.longitude;
        setUserLocation({ latitude: lat, longitude: lng });
      } else {
        // Fallback to Dallas, Texas for web preview / demo
        lat = 32.7767;
        lng = -96.7970;
        setUserLocation({ latitude: lat, longitude: lng });
      }
      
      try {
        const nearbyPlaces = await api.getNearbyPlaces(lat, lng, 2000, 25);
        setPlaces(nearbyPlaces);
      } catch (apiError) {
        console.error('API Error:', apiError);
      }
    } catch (e) {
      console.error('Error loading data:', e);
      // Fallback for demo - Dallas, Texas
      try {
        const nearbyPlaces = await api.getNearbyPlaces(32.7767, -96.7970, 2000, 25);
        setPlaces(nearbyPlaces);
        setUserLocation({ latitude: 32.7767, longitude: -96.7970 });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentLocation, requestPermission]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleCheckIn = async (place: NearbyPlace) => {
    setCheckingIn(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Location Required', 'Please enable GPS to check in.');
        return;
      }
      
      await api.checkIn(place.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        isMocked: location.isMocked,
      });
      
      Alert.alert("You're part of the vibe ✓", `Now at ${place.name}`);
      setSheetVisible(false);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Check-in Failed', e.message || 'Please try again');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Nearby Places</Text>
          <Text style={styles.headerSubtitle}>
            {places.length} places found • {userLocation ? 'GPS active' : 'Getting location...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.gold.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={COLORS.gold.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
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

      {/* Places List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold.primary} />
          <Text style={styles.loadingText}>Finding places nearby...</Text>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try refreshing or check your location</Text>
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
              tintColor={COLORS.gold.primary}
            />
          }
        >
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onPress={() => {
                setSelectedPlace(place);
                setSheetVisible(true);
              }}
              onCheckIn={() => handleCheckIn(place)}
              checkingIn={checkingIn && selectedPlace?.id === place.id}
            />
          ))}
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Showing places within 2km
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Place Detail Bottom Sheet */}
      <PlaceBottomSheet
        visible={sheetVisible}
        place={selectedPlace}
        onCheckIn={() => selectedPlace && handleCheckIn(selectedPlace)}
        onClose={() => {
          setSheetVisible(false);
          setSelectedPlace(null);
        }}
        checkingIn={checkingIn}
      />
    </View>
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
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
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
    color: COLORS.text.tertiary,
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
    textAlign: 'center',
  },
  placesList: {
    flex: 1,
  },
  placesContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  placeCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  placeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  activityDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingEmoji: {
    fontSize: 18,
  },
  placeInfo: {
    flex: 1,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  googleBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  placeType: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  activityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkInBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.text.muted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    marginBottom: 20,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  trendingBadge: {
    fontSize: 14,
    color: '#ff5533',
    fontWeight: '600',
  },
  sheetSubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  sheetAddress: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  sheetActivity: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  activityBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  activityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sheetActivityText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkInButton: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  seePeopleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    gap: 8,
  },
  seePeopleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gold.primary,
  },
});

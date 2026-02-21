import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Place {
  id: string;
  name: string;
  type: string;
  distance: string;
  activity: number; // 0-100
  peopleCount: number;
  trending: boolean;
}

const mockPlaces: Place[] = [
  { id: '1', name: 'Neon Club', type: 'Nightclub', distance: '0.3 km', activity: 92, peopleCount: 156, trending: true },
  { id: '2', name: 'Skybar Rooftop', type: 'Bar', distance: '0.5 km', activity: 78, peopleCount: 89, trending: true },
  { id: '3', name: 'The Social House', type: 'Lounge', distance: '0.8 km', activity: 65, peopleCount: 52, trending: false },
  { id: '4', name: 'Velvet Room', type: 'Club', distance: '1.2 km', activity: 45, peopleCount: 34, trending: false },
  { id: '5', name: 'Cafe Luna', type: 'Cafe', distance: '0.2 km', activity: 38, peopleCount: 18, trending: false },
];

const getActivityColor = (activity: number) => {
  if (activity >= 80) return ['#ff5533', '#ff7b35'];
  if (activity >= 60) return ['#ff9800', '#ffb74d'];
  if (activity >= 40) return ['#ffc107', '#ffeb3b'];
  return ['#4caf50', '#81c784'];
};

const getActivityLabel = (activity: number) => {
  if (activity >= 80) return 'On Fire!';
  if (activity >= 60) return 'Hot';
  if (activity >= 40) return 'Active';
  return 'Chill';
};

const PlaceCard = ({ place }: { place: Place }) => {
  const activityColors = getActivityColor(place.activity);
  const activityLabel = getActivityLabel(place.activity);

  return (
    <TouchableOpacity style={styles.placeCard} activeOpacity={0.85}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.placeCardGradient}
      >
        <View style={styles.placeHeader}>
          <View style={styles.placeInfo}>
            <View style={styles.placeNameRow}>
              <Text style={styles.placeName}>{place.name}</Text>
              {place.trending && (
                <View style={styles.trendingBadge}>
                  <Ionicons name="flame" size={12} color="#ff5533" />
                </View>
              )}
            </View>
            <Text style={styles.placeType}>{place.type} • {place.distance}</Text>
          </View>
          <View style={styles.activityBadge}>
            <LinearGradient
              colors={activityColors}
              style={styles.activityBadgeGradient}
            >
              <Text style={styles.activityPercent}>{place.activity}%</Text>
            </LinearGradient>
            <Text style={styles.activityLabel}>{activityLabel}</Text>
          </View>
        </View>

        {/* Activity Bar */}
        <View style={styles.activityBarContainer}>
          <View style={styles.activityBarBg}>
            <LinearGradient
              colors={activityColors}
              style={[styles.activityBarFill, { width: `${place.activity}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.placeStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.statText}>{place.peopleCount} people</Text>
          </View>
          <TouchableOpacity style={styles.checkInButton}>
            <Ionicons name="qr-code" size={16} color="#ff7b35" />
            <Text style={styles.checkInText}>Check In</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'trending', label: 'Trending', icon: 'flame' },
    { id: 'nearby', label: 'Nearby', icon: 'location' },
    { id: 'clubs', label: 'Clubs', icon: 'musical-notes' },
    { id: 'bars', label: 'Bars', icon: 'wine' },
  ];

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
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Live Activity</Text>
      </View>

      {/* Places List */}
      <ScrollView
        style={styles.placesList}
        contentContainerStyle={styles.placesContent}
        showsVerticalScrollIndicator={false}
      >
        {mockPlaces.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </ScrollView>
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
    gap: 10,
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
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
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
    backgroundColor: 'rgba(255, 85, 51, 0.2)',
    padding: 4,
    borderRadius: 8,
  },
  placeType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  activityBadge: {
    alignItems: 'center',
  },
  activityBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activityPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activityLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  activityBarContainer: {
    marginBottom: 12,
  },
  activityBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  activityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  placeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 123, 53, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  checkInText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff7b35',
  },
});

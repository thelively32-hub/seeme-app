import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

interface UserAtPlace {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  intention?: string;
  looking_for?: string[];
  bio?: string;
  photo_url?: string;
  is_premium: boolean;
  checked_in_at: string;
  vibe_sent: boolean;
}

interface PlaceData {
  place_id: string;
  place_name: string;
  total_users: number;
  users: UserAtPlace[];
  can_see_all: boolean;
}

// Intention badge colors
const getIntentionStyle = (intention?: string) => {
  switch (intention) {
    case 'friendship':
      return { bg: 'rgba(76, 175, 80, 0.15)', text: '#4CAF50', label: '👋 Friendship' };
    case 'dating':
      return { bg: 'rgba(233, 30, 99, 0.15)', text: '#E91E63', label: '💕 Dating' };
    case 'networking':
      return { bg: 'rgba(33, 150, 243, 0.15)', text: '#2196F3', label: '💼 Networking' };
    case 'casual':
      return { bg: 'rgba(255, 152, 0, 0.15)', text: '#FF9800', label: '🎉 Just vibing' };
    default:
      return { bg: 'rgba(158, 158, 158, 0.15)', text: '#9E9E9E', label: '✨ Open' };
  }
};

// User Card Component
const UserCard = ({
  user,
  onViewProfile,
  onSendVibe,
  sendingVibe,
}: {
  user: UserAtPlace;
  onViewProfile: () => void;
  onSendVibe: () => void;
  sendingVibe: boolean;
}) => {
  const intentionStyle = getIntentionStyle(user.intention);
  
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <TouchableOpacity style={styles.userCard} onPress={onViewProfile} activeOpacity={0.8}>
      <View style={styles.userCardInner}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={COLORS.gradients.goldButton as [string, string, string]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{user.name?.charAt(0) || '?'}</Text>
            </LinearGradient>
          )}
          {user.is_premium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={10} color={COLORS.text.dark} />
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user.name}</Text>
            {user.age && <Text style={styles.userAge}>, {user.age}</Text>}
          </View>
          
          {/* Intention Badge */}
          <View style={[styles.intentionBadge, { backgroundColor: intentionStyle.bg }]}>
            <Text style={[styles.intentionText, { color: intentionStyle.text }]}>
              {intentionStyle.label}
            </Text>
          </View>
          
          <Text style={styles.checkedInTime}>Checked in {timeAgo(user.checked_in_at)}</Text>
        </View>

        {/* Send Vibe Button */}
        <TouchableOpacity
          style={[
            styles.vibeButton,
            user.vibe_sent && styles.vibeButtonSent,
          ]}
          onPress={onSendVibe}
          disabled={user.vibe_sent || sendingVibe}
        >
          {sendingVibe ? (
            <ActivityIndicator size="small" color={COLORS.gold.primary} />
          ) : user.vibe_sent ? (
            <Ionicons name="checkmark" size={20} color={COLORS.accent.success} />
          ) : (
            <Ionicons name="hand-right" size={20} color={COLORS.gold.primary} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function PlaceUsersScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingVibeUserId, setSendingVibeUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async (showLoader = true) => {
    if (!id) return;
    try {
      if (showLoader) setLoading(true);
      const data = await api.getUsersAtPlace(id);
      setPlaceData(data);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers(false);
  };

  const handleSendVibe = async (user: UserAtPlace) => {
    setSendingVibeUserId(user.id);
    try {
      await api.sendVibe(user.id, 'Hey! 👋', 'wave', id);
      Alert.alert('Vibe Sent! ✨', `${user.name} will see your vibe`, [{ text: 'OK' }]);
      loadUsers(false);
    } catch (e: any) {
      Alert.alert('Oops!', e.message || 'Could not send vibe');
    } finally {
      setSendingVibeUserId(null);
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {placeData?.place_name || name || 'Place'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {placeData?.total_users || 0} people here now
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={COLORS.gold.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold.primary} />
          <Text style={styles.loadingText}>Finding people...</Text>
        </View>
      ) : !placeData || placeData.users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👀</Text>
          <Text style={styles.emptyTitle}>No one here yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to check in and attract others!
          </Text>
          <TouchableOpacity style={styles.checkInButton} onPress={() => router.back()}>
            <LinearGradient
              colors={COLORS.gradients.goldButton as [string, string, string]}
              style={styles.checkInButtonGradient}
            >
              <Ionicons name="location" size={20} color={COLORS.text.dark} />
              <Text style={styles.checkInButtonText}>Check In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold.primary} />
          }
        >
          {/* Limited view notice */}
          {!placeData.can_see_all && placeData.total_users > placeData.users.length && (
            <View style={styles.limitedNotice}>
              <Ionicons name="lock-closed" size={16} color={COLORS.gold.primary} />
              <Text style={styles.limitedText}>
                Showing {placeData.users.length} of {placeData.total_users} people.
                <Text style={styles.upgradeLink}> Upgrade to see all</Text>
              </Text>
            </View>
          )}

          {/* Users List */}
          {placeData.users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onViewProfile={() => handleViewProfile(user.id)}
              onSendVibe={() => handleSendVibe(user)}
              sendingVibe={sendingVibeUserId === user.id}
            />
          ))}

          {/* Tip */}
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>
              💡 Tap a profile to learn more, or send a vibe to break the ice!
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gold.primary,
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  checkInButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  limitedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  limitedText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  upgradeLink: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  userCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.card,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  userAge: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  intentionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  intentionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkedInTime: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 4,
  },
  vibeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeButtonSent: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  tipContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});

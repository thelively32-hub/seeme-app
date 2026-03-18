import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Animated,
  Easing,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

interface Vibe {
  id: string;
  from_user: {
    id: string;
    name: string;
    photo_url?: string;
    age?: number;
  };
  to_user?: {
    id: string;
    name: string;
  };
  message: string;
  vibe_type: string;
  place_name?: string;
  status: string;
  created_at: string;
  expires_at: string;
}

// Vibe animation component
const VibeAnimation = ({ type }: { type: string }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const getEmoji = () => {
    switch (type) {
      case 'wave': return '👋';
      case 'wink': return '😉';
      case 'coffee': return '☕';
      case 'drink': return '🍸';
      case 'dance': return '💃';
      default: return '✨';
    }
  };

  return (
    <Animated.View style={[styles.vibeEmoji, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.vibeEmojiText}>{getEmoji()}</Text>
    </Animated.View>
  );
};

// Time ago helper
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(dateString).toLocaleDateString();
};

// Vibe Card Component
const VibeCard = ({
  vibe,
  type,
  onAccept,
  onDecline,
  onViewProfile,
}: {
  vibe: Vibe;
  type: 'received' | 'sent';
  onAccept?: () => void;
  onDecline?: () => void;
  onViewProfile: () => void;
}) => {
  const isReceived = type === 'received';
  const user = isReceived ? vibe.from_user : vibe.to_user;
  const isPending = vibe.status === 'pending';

  return (
    <TouchableOpacity style={styles.vibeCard} onPress={onViewProfile} activeOpacity={0.8}>
      <View style={styles.vibeCardInner}>
        {/* Avatar */}
        <View style={styles.vibeAvatar}>
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.vibeAvatarImage} />
          ) : (
            <LinearGradient
              colors={COLORS.gradients.goldButton as [string, string, string]}
              style={styles.vibeAvatarGradient}
            >
              <Text style={styles.vibeAvatarText}>
                {user?.name?.charAt(0) || '?'}
              </Text>
            </LinearGradient>
          )}
          <VibeAnimation type={vibe.vibe_type} />
        </View>

        {/* Content */}
        <View style={styles.vibeContent}>
          <View style={styles.vibeHeader}>
            <Text style={styles.vibeName}>{user?.name || 'Someone'}</Text>
            {user?.age && <Text style={styles.vibeAge}>, {user.age}</Text>}
          </View>
          <Text style={styles.vibeMessage}>"{vibe.message}"</Text>
          <View style={styles.vibeMeta}>
            {vibe.place_name && (
              <View style={styles.vibeLocation}>
                <Ionicons name="location" size={12} color={COLORS.text.muted} />
                <Text style={styles.vibeLocationText}>{vibe.place_name}</Text>
              </View>
            )}
            <Text style={styles.vibeTime}>{timeAgo(vibe.created_at)}</Text>
          </View>
        </View>

        {/* Status/Actions */}
        {isReceived && isPending ? (
          <View style={styles.vibeActions}>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
              <Ionicons name="close" size={20} color={COLORS.text.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.statusBadge,
            vibe.status === 'accepted' && styles.statusAccepted,
            vibe.status === 'declined' && styles.statusDeclined,
          ]}>
            <Text style={styles.statusText}>
              {vibe.status === 'pending' ? '⏳' : vibe.status === 'accepted' ? '✓' : '✗'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Stats Card
const StatsCard = ({ stats }: { stats: any }) => (
  <View style={styles.statsCard}>
    <View style={styles.statItem}>
      <Text style={styles.statValue}>
        {stats?.vibes_remaining === 'unlimited' ? '∞' : stats?.vibes_remaining || 0}
      </Text>
      <Text style={styles.statLabel}>Vibes Left</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{stats?.vibes_sent_today || 0}</Text>
      <Text style={styles.statLabel}>Sent Today</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={[styles.statValue, !stats?.is_premium && styles.statValueFree]}>
        {stats?.is_premium ? 'PRO' : 'FREE'}
      </Text>
      <Text style={styles.statLabel}>Plan</Text>
    </View>
  </View>
);

export default function VibesScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedVibes, setReceivedVibes] = useState<Vibe[]>([]);
  const [sentVibes, setSentVibes] = useState<Vibe[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [received, sent, vibeStats] = await Promise.all([
        api.getReceivedVibes(),
        api.getSentVibes(),
        api.getVibeStats(),
      ]);
      setReceivedVibes(received);
      setSentVibes(sent);
      setStats(vibeStats);
    } catch (e) {
      console.error('Error loading vibes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleAcceptVibe = async (vibeId: string) => {
    try {
      await api.respondToVibe(vibeId, 'accept');
      Alert.alert('Connected! 🎉', 'You can now chat with this person');
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not accept vibe');
    }
  };

  const handleDeclineVibe = async (vibeId: string) => {
    try {
      await api.respondToVibe(vibeId, 'decline');
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not decline vibe');
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const vibes = activeTab === 'received' ? receivedVibes : sentVibes;
  const pendingCount = receivedVibes.filter(v => v.status === 'pending').length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Vibes</Text>
            <Text style={styles.headerSubtitle}>Connect with people around you</Text>
          </View>
          {!stats?.is_premium && (
            <TouchableOpacity style={styles.upgradeButton}>
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.upgradeButtonGradient}
              >
                <Ionicons name="star" size={14} color={COLORS.text.dark} />
                <Text style={styles.upgradeButtonText}>PRO</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        {stats && <StatsCard stats={stats} />}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.tabActive]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
              Received
            </Text>
            {pendingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
              Sent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vibes List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold.primary} />
          </View>
        ) : vibes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'received' ? '📭' : '📤'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'received' ? 'No vibes yet' : 'No vibes sent'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'received'
                ? 'When someone sends you a vibe, it will appear here'
                : 'Check in at a place and send vibes to people there'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/map')}
            >
              <Text style={styles.emptyButtonText}>Find People Nearby</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vibesList}>
            {vibes.map((vibe) => (
              <VibeCard
                key={vibe.id}
                vibe={vibe}
                type={activeTab}
                onAccept={() => handleAcceptVibe(vibe.id)}
                onDecline={() => handleDeclineVibe(vibe.id)}
                onViewProfile={() => handleViewProfile(
                  activeTab === 'received' ? vibe.from_user.id : vibe.to_user?.id || ''
                )}
              />
            ))}
          </View>
        )}

        {/* Info about vibes expiring */}
        {vibes.length > 0 && (
          <Text style={styles.expiryNote}>
            💡 Vibes expire after 24 hours
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  upgradeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gold.primary,
  },
  statValueFree: {
    color: COLORS.text.tertiary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border.light,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.gold.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  tabTextActive: {
    color: COLORS.text.dark,
  },
  tabBadge: {
    backgroundColor: COLORS.live.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.gold.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
  vibesList: {
    paddingHorizontal: 20,
  },
  vibeCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  vibeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  vibeAvatar: {
    position: 'relative',
  },
  vibeAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  vibeAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  vibeEmoji: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeEmojiText: {
    fontSize: 14,
  },
  vibeContent: {
    flex: 1,
  },
  vibeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  vibeName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  vibeAge: {
    fontSize: 15,
    color: COLORS.text.tertiary,
  },
  vibeMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  vibeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  vibeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  vibeLocationText: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  vibeTime: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  vibeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAccepted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusDeclined: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  statusText: {
    fontSize: 14,
  },
  expiryNote: {
    fontSize: 13,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 20,
  },
});

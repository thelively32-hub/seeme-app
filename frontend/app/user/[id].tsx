import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  bio?: string;
  photo_url?: string;
  intention?: string;
  looking_for?: string[];
  is_premium: boolean;
  stats: {
    total_checkins: number;
    connections: number;
    avg_rating: number;
    review_count: number;
  };
  recent_places: Array<{ name: string; date: string }>;
  reviews: Array<{
    id: string;
    from_user_name: string;
    rating: number;
    tags: string[];
    comment?: string;
    created_at: string;
  }>;
}

// Vibe types with emojis
const VIBE_TYPES = [
  { id: 'wave', emoji: '👋', label: 'Hey!', message: 'Hey! 👋' },
  { id: 'wink', emoji: '😉', label: 'Wink', message: 'Caught my eye 😉' },
  { id: 'coffee', emoji: '☕', label: 'Coffee', message: 'Coffee sometime? ☕' },
  { id: 'drink', emoji: '🍸', label: 'Drink', message: 'Can I buy you a drink? 🍸' },
  { id: 'dance', emoji: '💃', label: 'Dance', message: 'Wanna dance? 💃' },
];

// Star Rating Component
const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => (
  <View style={styles.starContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : 'star-outline'}
        size={size}
        color={COLORS.gold.primary}
      />
    ))}
  </View>
);

// Vibe Selector Modal
const VibeSelectorModal = ({
  visible,
  onClose,
  onSend,
  userName,
  sending,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (type: string, message: string) => void;
  userName: string;
  sending: boolean;
}) => {
  const [selectedVibe, setSelectedVibe] = useState(VIBE_TYPES[0]);
  const [customMessage, setCustomMessage] = useState('');
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.vibeModal, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.vibeModalTitle}>Send a Vibe to {userName}</Text>
          <Text style={styles.vibeModalSubtitle}>Choose how you want to say hi</Text>

          {/* Vibe Types */}
          <View style={styles.vibeTypesGrid}>
            {VIBE_TYPES.map((vibe) => (
              <TouchableOpacity
                key={vibe.id}
                style={[
                  styles.vibeTypeButton,
                  selectedVibe.id === vibe.id && styles.vibeTypeButtonActive,
                ]}
                onPress={() => setSelectedVibe(vibe)}
              >
                <Text style={styles.vibeTypeEmoji}>{vibe.emoji}</Text>
                <Text style={[
                  styles.vibeTypeLabel,
                  selectedVibe.id === vibe.id && styles.vibeTypeLabelActive,
                ]}>
                  {vibe.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview */}
          <View style={styles.messagePreview}>
            <Text style={styles.messagePreviewLabel}>Your message:</Text>
            <Text style={styles.messagePreviewText}>"{selectedVibe.message}"</Text>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendVibeButton}
              onPress={() => onSend(selectedVibe.id, selectedVibe.message)}
              disabled={sending}
            >
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.sendVibeButtonGradient}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.text.dark} />
                ) : (
                  <>
                    <Text style={styles.sendVibeButtonText}>Send Vibe</Text>
                    <Text style={styles.sendVibeEmoji}>{selectedVibe.emoji}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Review Card
const ReviewCard = ({ review }: { review: UserProfile['reviews'][0] }) => {
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.from_user_name}</Text>
        <StarRating rating={review.rating} size={14} />
      </View>
      {review.tags.length > 0 && (
        <View style={styles.reviewTags}>
          {review.tags.map((tag, i) => (
            <View key={i} style={styles.reviewTag}>
              <Text style={styles.reviewTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      {review.comment && <Text style={styles.reviewComment}>"{review.comment}"</Text>}
      <Text style={styles.reviewTime}>{timeAgo(review.created_at)}</Text>
    </View>
  );
};

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const [sendingVibe, setSendingVibe] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getUserProfile(id);
      setProfile(data);
    } catch (e) {
      console.error('Error loading profile:', e);
      Alert.alert('Error', 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSendVibe = async (vibeType: string, message: string) => {
    if (!id) return;
    setSendingVibe(true);
    try {
      await api.sendVibe(id, message, vibeType);
      setShowVibeModal(false);
      Alert.alert('Vibe Sent! ✨', `${profile?.name} will see your vibe`);
    } catch (e: any) {
      Alert.alert('Oops!', e.message || 'Could not send vibe');
    } finally {
      setSendingVibe(false);
    }
  };

  const getIntentionLabel = (intention?: string) => {
    switch (intention) {
      case 'friendship': return '👋 Looking for friendship';
      case 'dating': return '💕 Open to dating';
      case 'networking': return '💼 Networking';
      case 'casual': return '🎉 Just here for the vibe';
      default: return '✨ Open to anything';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.gold.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            {profile.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.profileAvatar} />
            ) : (
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.profileAvatarGradient}
              >
                <Text style={styles.profileAvatarText}>
                  {profile.name?.charAt(0) || '?'}
                </Text>
              </LinearGradient>
            )}
            {profile.is_premium && (
              <View style={styles.premiumBadgeLarge}>
                <Ionicons name="star" size={14} color={COLORS.text.dark} />
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>

          {/* Name & Age */}
          <Text style={styles.profileName}>
            {profile.name}{profile.age ? `, ${profile.age}` : ''}
          </Text>

          {/* Intention */}
          <Text style={styles.profileIntention}>
            {getIntentionLabel(profile.intention)}
          </Text>

          {/* Bio */}
          {profile.bio && (
            <Text style={styles.profileBio}>{profile.bio}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.stats.total_checkins}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.stats.connections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color={COLORS.gold.primary} />
                <Text style={styles.statNumber}>{profile.stats.avg_rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{profile.stats.review_count} reviews</Text>
            </View>
          </View>
        </View>

        {/* Send Vibe Button */}
        <TouchableOpacity
          style={styles.sendVibeMainButton}
          onPress={() => setShowVibeModal(true)}
        >
          <LinearGradient
            colors={COLORS.gradients.goldButton as [string, string, string]}
            style={styles.sendVibeMainButtonGradient}
          >
            <Ionicons name="hand-right" size={22} color={COLORS.text.dark} />
            <Text style={styles.sendVibeMainButtonText}>Send a Vibe</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Places */}
        {profile.recent_places.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Places</Text>
            <View style={styles.placesCard}>
              {profile.recent_places.map((place, i) => (
                <View key={i} style={styles.placeItem}>
                  <Ionicons name="location" size={18} color={COLORS.gold.primary} />
                  <Text style={styles.placeName}>{place.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reviews ({profile.stats.review_count})
          </Text>
          {profile.reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          ) : (
            profile.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Vibe Selector Modal */}
      <VibeSelectorModal
        visible={showVibeModal}
        onClose={() => setShowVibeModal(false)}
        onSend={handleSendVibe}
        userName={profile.name}
        sending={sendingVibe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  goBackText: {
    fontSize: 16,
    color: COLORS.gold.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  moreButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.gold.primary,
  },
  profileAvatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  premiumBadgeLarge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  profileIntention: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  profileBio: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border.light,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sendVibeMainButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  sendVibeMainButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  sendVibeMainButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  placesCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  placeName: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  noReviews: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  noReviewsText: {
    fontSize: 15,
    color: COLORS.text.muted,
  },
  reviewCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reviewTag: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reviewTagText: {
    fontSize: 12,
    color: COLORS.gold.primary,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reviewTime: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  vibeModal: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  vibeModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  vibeModalSubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  vibeTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  vibeTypeButton: {
    width: 70,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vibeTypeButtonActive: {
    borderColor: COLORS.gold.primary,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  vibeTypeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  vibeTypeLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  vibeTypeLabelActive: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  messagePreview: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  messagePreviewLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginBottom: 6,
  },
  messagePreviewText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  sendVibeButton: {
    flex: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendVibeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  sendVibeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
  sendVibeEmoji: {
    fontSize: 18,
  },
});

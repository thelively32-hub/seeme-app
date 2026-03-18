import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';
import VibeSelector from '../../src/components/VibeSelector';
import { getVibeById } from '../../src/constants/vibes';

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
  current_vibe?: {
    vibe_id: string;
    message: string;
    set_at: string;
  };
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

// Review Card
const ReviewCard = ({ review }: { review: UserProfile['reviews'][0] }) => {
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Hoy';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
    return `${Math.floor(diffDays / 30)}mes`;
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
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSendVibe = async (vibeId: string, message: string) => {
    if (!id) return;
    setSendingVibe(true);
    try {
      await api.sendVibe(id, message, vibeId);
      setShowVibeModal(false);
      
      const vibe = getVibeById(vibeId);
      Alert.alert(
        `${vibe?.icon || '✨'} ¡Vibe Enviado!`,
        `${profile?.name} recibirá tu vibe "${vibe?.labelEs || vibeId}"`
      );
    } catch (e: any) {
      Alert.alert('Oops!', e.message || 'No se pudo enviar el vibe');
    } finally {
      setSendingVibe(false);
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Opciones',
      `¿Qué deseas hacer con ${profile?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reportar',
          onPress: handleReport,
        },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: handleBlock,
        },
      ]
    );
  };

  const handleReport = () => {
    Alert.alert(
      'Reportar usuario',
      'Selecciona el motivo del reporte:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Contenido inapropiado', onPress: () => submitReport('inappropriate_content') },
        { text: 'Acoso', onPress: () => submitReport('harassment') },
        { text: 'Perfil falso', onPress: () => submitReport('fake_profile') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Comportamiento amenazante', onPress: () => submitReport('threatening') },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!id) return;
    try {
      await api.reportUser(id, reason);
      Alert.alert('Reporte enviado', 'Gracias por ayudarnos a mantener SEE ME seguro.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo enviar el reporte');
    }
  };

  const handleBlock = () => {
    Alert.alert(
      'Bloquear usuario',
      `¿Estás seguro de que quieres bloquear a ${profile?.name}? No podrán verte ni enviarte Vibes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await api.blockUser(id);
              Alert.alert('Usuario bloqueado', 'Ya no podrás ver a este usuario ni él a ti.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (e: any) {
              Alert.alert('Error', 'No se pudo bloquear al usuario');
            }
          },
        },
      ]
    );
  };

  const getIntentionDisplay = (intention?: string) => {
    switch (intention) {
      case 'relationship': return { icon: '💕', text: 'Buscando relación' };
      case 'friendship': return { icon: '🤝', text: 'Buscando amistad' };
      case 'networking': return { icon: '💼', text: 'Networking' };
      case 'casual': return { icon: '😎', text: 'Solo vibras' };
      default: return { icon: '✨', text: 'Abierto a todo' };
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
        <Text style={styles.errorText}>Perfil no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.goBackText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const intention = getIntentionDisplay(profile.intention);
  const currentVibe = profile.current_vibe ? getVibeById(profile.current_vibe.vibe_id) : null;

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
        <TouchableOpacity style={styles.moreButton} onPress={handleMoreOptions}>
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
                <Ionicons name="star" size={12} color={COLORS.text.dark} />
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>

          {/* Name & Age */}
          <Text style={styles.profileName}>
            {profile.name}{profile.age ? `, ${profile.age}` : ''}
          </Text>

          {/* Intention Badge */}
          <View style={styles.intentionBadge}>
            <Text style={styles.intentionIcon}>{intention.icon}</Text>
            <Text style={styles.intentionText}>{intention.text}</Text>
          </View>

          {/* Current Vibe (if set) */}
          {currentVibe && (
            <View style={[styles.currentVibe, { backgroundColor: `${currentVibe.color}20` }]}>
              <Text style={styles.currentVibeLabel}>Mi vibe de hoy</Text>
              <View style={styles.currentVibeContent}>
                <Text style={styles.currentVibeEmoji}>{currentVibe.icon}</Text>
                <View>
                  <Text style={[styles.currentVibeTitle, { color: currentVibe.color }]}>
                    {currentVibe.labelEs}
                  </Text>
                  <Text style={styles.currentVibeMessage}>
                    "{profile.current_vibe?.message || currentVibe.defaultMessageEs}"
                  </Text>
                </View>
              </View>
            </View>
          )}

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
              <Text style={styles.statLabel}>Conexiones</Text>
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
            <Text style={styles.sendVibeEmoji}>👋</Text>
            <Text style={styles.sendVibeMainButtonText}>Enviar un Vibe</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Places */}
        {profile.recent_places.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lugares Recientes</Text>
            <View style={styles.placesCard}>
              {profile.recent_places.map((place, i) => (
                <View key={i} style={[
                  styles.placeItem,
                  i === profile.recent_places.length - 1 && { borderBottomWidth: 0 }
                ]}>
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
              <Text style={styles.noReviewsEmoji}>📝</Text>
              <Text style={styles.noReviewsText}>Aún no hay reviews</Text>
            </View>
          ) : (
            profile.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Vibe Selector Modal */}
      <VibeSelector
        visible={showVibeModal}
        onClose={() => setShowVibeModal(false)}
        onSend={handleSendVibe}
        recipientName={profile.name}
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
    marginBottom: 8,
  },
  intentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  intentionIcon: {
    fontSize: 18,
  },
  intentionText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  currentVibe: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  currentVibeLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentVibeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentVibeEmoji: {
    fontSize: 40,
  },
  currentVibeTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  currentVibeMessage: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  profileBio: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    width: '100%',
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
  sendVibeEmoji: {
    fontSize: 24,
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
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  placeName: {
    fontSize: 15,
    color: COLORS.text.secondary,
    flex: 1,
  },
  noReviews: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  noReviewsEmoji: {
    fontSize: 40,
    marginBottom: 12,
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
});

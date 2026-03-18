import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import COLORS from '../../src/theme/colors';

interface InvitationDetail {
  id: string;
  user_id: string;
  user_name: string;
  user_photo: string | null;
  user_vibes_received: number | null;
  user_rating: number | null;
  user_reviews_count: number | null;
  user_places_visited: number | null;
  user_is_verified: boolean | null;
  text: string;
  payment_type: 'full' | 'half';
  event_date: string;
  event_time: string | null;
  place_name: string | null;
  place_address: string | null;
  created_at: string;
  expires_at: string;
  responses_count: number;
  is_targeted: boolean;
  can_see_profile: boolean;
  has_responded: boolean;
  is_accepted: boolean;
}

export default function InvitationDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  const isPremium = user?.is_premium || false;

  useEffect(() => {
    loadInvitation();
  }, [id]);

  const loadInvitation = async () => {
    try {
      const data = await api.getInvitation(id as string);
      setInvitation(data);
    } catch (error) {
      console.error('Error loading invitation:', error);
      Alert.alert('Error', 'No se pudo cargar la invitación');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!invitation) return;
    
    setResponding(true);
    try {
      await api.respondToInvitation(invitation.id);
      Alert.alert(
        '¡Enviado!',
        `Tu interés fue enviado a ${invitation.user_name}. Te notificaremos si te acepta.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar tu respuesta');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.gold.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!invitation) return null;

  const eventDate = new Date(invitation.event_date);
  const formattedDate = eventDate.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

  const canSeeProfile = invitation.can_see_profile;

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
        <Text style={styles.headerTitle}>Invitación</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {invitation.user_photo ? (
              <Image source={{ uri: invitation.user_photo }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.text.muted} />
              </View>
            )}
            
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{invitation.user_name}</Text>
                {canSeeProfile && invitation.user_is_verified && (
                  <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                )}
              </View>
              
              {/* Payment Badge */}
              <View style={[
                styles.paymentBadge, 
                invitation.payment_type === 'full' ? styles.paymentFull : styles.paymentHalf
              ]}>
                <Ionicons 
                  name={invitation.payment_type === 'full' ? 'wallet' : 'git-compare'} 
                  size={14} 
                  color={invitation.payment_type === 'full' ? '#10B981' : COLORS.gold.primary} 
                />
                <Text style={[
                  styles.paymentText,
                  invitation.payment_type === 'full' ? styles.paymentTextFull : styles.paymentTextHalf
                ]}>
                  {invitation.payment_type === 'full' ? 'Yo invito todo' : 'Dividimos 50/50'}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Stats - Only visible for Premium or accepted users */}
          {canSeeProfile ? (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="star" size={20} color={COLORS.gold.primary} />
                <Text style={styles.statValue}>
                  {invitation.user_rating?.toFixed(1) || '-'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="heart" size={20} color="#FF6B6B" />
                <Text style={styles.statValue}>
                  {invitation.user_vibes_received || 0}
                </Text>
                <Text style={styles.statLabel}>Vibes</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="chatbubbles" size={20} color="#8B5CF6" />
                <Text style={styles.statValue}>
                  {invitation.user_reviews_count || 0}
                </Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="location" size={20} color="#3B82F6" />
                <Text style={styles.statValue}>
                  {invitation.user_places_visited || 0}
                </Text>
                <Text style={styles.statLabel}>Lugares</Text>
              </View>
            </View>
          ) : (
            <View style={styles.lockedProfileBanner}>
              <Ionicons name="lock-closed" size={20} color={COLORS.text.muted} />
              <Text style={styles.lockedProfileText}>
                {isPremium 
                  ? 'Cargando perfil...' 
                  : 'Perfil bloqueado. Responde y espera a ser aceptado para ver más detalles.'}
              </Text>
              {!isPremium && (
                <TouchableOpacity style={styles.upgradeBadge}>
                  <Ionicons name="star" size={12} color={COLORS.gold.primary} />
                  <Text style={styles.upgradeText}>Premium</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Invitation Details */}
        <View style={styles.invitationCard}>
          <Text style={styles.invitationText}>{invitation.text}</Text>
          
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color={COLORS.gold.primary} />
              <Text style={styles.detailText}>{formattedDate}</Text>
            </View>
            
            {invitation.event_time && (
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color={COLORS.gold.primary} />
                <Text style={styles.detailText}>{invitation.event_time}</Text>
              </View>
            )}
            
            {invitation.place_name && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color={COLORS.gold.primary} />
                <View>
                  <Text style={styles.detailText}>{invitation.place_name}</Text>
                  {invitation.place_address && (
                    <Text style={styles.detailSubtext}>{invitation.place_address}</Text>
                  )}
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.responsesInfo}>
            <Ionicons name="people" size={16} color={COLORS.text.muted} />
            <Text style={styles.responsesText}>
              {invitation.responses_count} personas interesadas
            </Text>
          </View>
        </View>

        {/* Status Banner */}
        {invitation.has_responded && (
          <View style={[
            styles.statusBanner,
            invitation.is_accepted ? styles.statusAccepted : styles.statusPending
          ]}>
            <Ionicons 
              name={invitation.is_accepted ? 'checkmark-circle' : 'hourglass'} 
              size={20} 
              color={invitation.is_accepted ? '#10B981' : COLORS.gold.primary} 
            />
            <Text style={[
              styles.statusText,
              invitation.is_accepted ? styles.statusTextAccepted : styles.statusTextPending
            ]}>
              {invitation.is_accepted 
                ? '¡Fuiste aceptado! Ya puedes chatear' 
                : 'Ya respondiste. Esperando aceptación...'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {!invitation.has_responded && invitation.user_id !== user?.id && (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={[styles.respondButton, responding && styles.respondButtonDisabled]}
            onPress={handleRespond}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator color={COLORS.text.dark} />
            ) : (
              <>
                <Ionicons name="hand-right" size={20} color={COLORS.text.dark} />
                <Text style={styles.respondButtonText}>Me interesa</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  profileCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
  },
  profilePhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  paymentFull: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  paymentHalf: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentTextFull: {
    color: '#10B981',
  },
  paymentTextHalf: {
    color: COLORS.gold.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  lockedProfileBanner: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  lockedProfileText: {
    fontSize: 13,
    color: COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gold.primary,
  },
  invitationCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  invitationText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    lineHeight: 26,
    marginBottom: 20,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
  detailSubtext: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  responsesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responsesText: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  statusPending: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  statusAccepted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  statusTextPending: {
    color: COLORS.gold.primary,
  },
  statusTextAccepted: {
    color: '#10B981',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.primary,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold.primary,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  respondButtonDisabled: {
    opacity: 0.7,
  },
  respondButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
});

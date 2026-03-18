import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

interface MyInvitation {
  id: string;
  text: string;
  payment_type: 'full' | 'half';
  event_date: string;
  event_time: string | null;
  place_name: string | null;
  created_at: string;
  expires_at: string;
  responses_count: number;
}

interface Responder {
  user_id: string;
  name: string;
  photo_url: string | null;
  vibes_received: number;
  rating: number | null;
  is_verified: boolean;
}

export default function MyInvitationsScreen() {
  const insets = useSafeAreaInsets();
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<string | null>(null);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loadingResponders, setLoadingResponders] = useState(false);
  const [showRespondersModal, setShowRespondersModal] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      const data = await api.getMyInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleDelete = async (invitationId: string) => {
    Alert.alert(
      'Eliminar Invitación',
      '¿Estás seguro de eliminar esta invitación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteInvitation(invitationId);
              setInvitations(prev => prev.filter(i => i.id !== invitationId));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const handleViewResponders = async (invitationId: string) => {
    setSelectedInvitation(invitationId);
    setLoadingResponders(true);
    setShowRespondersModal(true);
    
    try {
      const data = await api.getInvitationResponses(invitationId);
      setResponders(data.responders);
    } catch (error) {
      console.error('Error loading responders:', error);
      Alert.alert('Error', 'No se pudieron cargar las respuestas');
    } finally {
      setLoadingResponders(false);
    }
  };

  const handleAcceptResponder = async (userId: string) => {
    if (!selectedInvitation) return;
    
    try {
      await api.acceptInvitationResponse(selectedInvitation, userId);
      Alert.alert('¡Aceptado!', 'Ya pueden chatear');
      setShowRespondersModal(false);
      loadInvitations();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo aceptar');
    }
  };

  const handleRejectResponder = async (userId: string) => {
    if (!selectedInvitation) return;
    
    try {
      await api.rejectInvitationResponse(selectedInvitation, userId);
      setResponders(prev => prev.filter(r => r.user_id !== userId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo rechazar');
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

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
        <Text style={styles.headerTitle}>Mis Invitaciones</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.gold.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {invitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color={COLORS.text.muted} />
            <Text style={styles.emptyTitle}>No tienes invitaciones</Text>
            <Text style={styles.emptySubtitle}>
              Publica un plan para ver quién se interesa
            </Text>
          </View>
        ) : (
          invitations.map((invitation) => {
            const expired = isExpired(invitation.expires_at);
            const eventDate = new Date(invitation.event_date);
            const formattedDate = eventDate.toLocaleDateString('es-ES', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            });

            return (
              <View 
                key={invitation.id} 
                style={[styles.card, expired && styles.cardExpired]}
              >
                {/* Status Badge */}
                {expired && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredText}>Expirada</Text>
                  </View>
                )}

                {/* Invitation Text */}
                <Text style={styles.invitationText}>{invitation.text}</Text>

                {/* Payment Type & Date */}
                <View style={styles.metaRow}>
                  <View style={[
                    styles.paymentBadge,
                    invitation.payment_type === 'full' ? styles.paymentFull : styles.paymentHalf
                  ]}>
                    <Ionicons 
                      name={invitation.payment_type === 'full' ? 'wallet' : 'git-compare'} 
                      size={12} 
                      color={invitation.payment_type === 'full' ? '#10B981' : COLORS.gold.primary} 
                    />
                    <Text style={[
                      styles.paymentText,
                      invitation.payment_type === 'full' ? styles.paymentTextFull : styles.paymentTextHalf
                    ]}>
                      {invitation.payment_type === 'full' ? 'Yo invito' : '50/50'}
                    </Text>
                  </View>
                  
                  <View style={styles.dateInfo}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.text.muted} />
                    <Text style={styles.dateText}>{formattedDate}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.responsesButton}
                    onPress={() => handleViewResponders(invitation.id)}
                  >
                    <Ionicons name="people" size={18} color={COLORS.gold.primary} />
                    <Text style={styles.responsesButtonText}>
                      {invitation.responses_count} respuestas
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(invitation.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Responders Modal */}
      <Modal
        visible={showRespondersModal}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respuestas</Text>
              <TouchableOpacity onPress={() => setShowRespondersModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingResponders ? (
              <ActivityIndicator size="large" color={COLORS.gold.primary} style={{ padding: 40 }} />
            ) : responders.length === 0 ? (
              <View style={styles.emptyResponders}>
                <Ionicons name="people-outline" size={48} color={COLORS.text.muted} />
                <Text style={styles.emptyRespondersText}>
                  Nadie ha respondido aún
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {responders.map((responder) => (
                  <View key={responder.user_id} style={styles.responderCard}>
                    <View style={styles.responderInfo}>
                      {responder.photo_url ? (
                        <Image source={{ uri: responder.photo_url }} style={styles.responderPhoto} />
                      ) : (
                        <View style={styles.responderPhotoPlaceholder}>
                          <Ionicons name="person" size={20} color={COLORS.text.muted} />
                        </View>
                      )}
                      <View style={styles.responderDetails}>
                        <View style={styles.responderNameRow}>
                          <Text style={styles.responderName}>{responder.name}</Text>
                          {responder.is_verified && (
                            <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                          )}
                        </View>
                        <View style={styles.responderStats}>
                          {responder.rating && (
                            <View style={styles.statItem}>
                              <Ionicons name="star" size={12} color={COLORS.gold.primary} />
                              <Text style={styles.statText}>{responder.rating.toFixed(1)}</Text>
                            </View>
                          )}
                          <View style={styles.statItem}>
                            <Ionicons name="heart" size={12} color="#FF6B6B" />
                            <Text style={styles.statText}>{responder.vibes_received}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.responderActions}>
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => handleAcceptResponder(responder.user_id)}
                      >
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => handleRejectResponder(responder.user_id)}
                      >
                        <Ionicons name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cardExpired: {
    opacity: 0.6,
  },
  expiredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  invitationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
    paddingRight: 60,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paymentFull: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  paymentHalf: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentTextFull: {
    color: '#10B981',
  },
  paymentTextHalf: {
    color: COLORS.gold.primary,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  responsesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  responsesButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gold.primary,
  },
  deleteButton: {
    padding: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  emptyResponders: {
    alignItems: 'center',
    padding: 40,
  },
  emptyRespondersText: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 12,
  },
  responderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  responderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  responderPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  responderPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  responderDetails: {
    flex: 1,
  },
  responderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  responderStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  responderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import COLORS from '../../src/theme/colors';
import TourTooltip from '../../src/components/TourTooltip';

interface Invitation {
  id: string;
  user_id: string;
  user_name: string;
  user_photo: string | null;
  user_vibes_received: number | null;
  user_rating: number | null;
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
}

const PaymentBadge = ({ type }: { type: 'full' | 'half' }) => (
  <View style={[styles.paymentBadge, type === 'full' ? styles.paymentFull : styles.paymentHalf]}>
    <Ionicons 
      name={type === 'full' ? 'wallet' : 'git-compare'} 
      size={12} 
      color={type === 'full' ? '#10B981' : COLORS.gold.primary} 
    />
    <Text style={[styles.paymentText, type === 'full' ? styles.paymentTextFull : styles.paymentTextHalf]}>
      {type === 'full' ? 'Yo invito' : '50/50'}
    </Text>
  </View>
);

// Simple Calendar Component
const SimpleCalendar = ({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateSelected = (day: number) => {
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentMonth.getMonth() &&
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  const isToday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === today.toDateString();
  };

  const handleSelectDay = (day: number) => {
    if (isDateDisabled(day)) return;
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(newDate);
  };

  const canGoPrevious = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth());
    return prevMonth.getMonth() >= today.getMonth() || prevMonth.getFullYear() > today.getFullYear();
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.calendarNavButton}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarDayNames}>
        {dayNames.map((name, index) => (
          <Text key={index} style={styles.calendarDayName}>{name}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.calendarDay,
              day === null && styles.calendarDayEmpty,
              day !== null && isDateDisabled(day) && styles.calendarDayDisabled,
              day !== null && isDateSelected(day) && styles.calendarDaySelected,
              day !== null && isToday(day) && !isDateSelected(day) && styles.calendarDayToday,
            ]}
            onPress={() => day !== null && handleSelectDay(day)}
            disabled={day === null || isDateDisabled(day)}
          >
            {day !== null && (
              <Text style={[
                styles.calendarDayText,
                isDateDisabled(day) && styles.calendarDayTextDisabled,
                isDateSelected(day) && styles.calendarDayTextSelected,
              ]}>
                {day}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Invitation Card Component
const InvitationCard = ({ 
  invitation, 
  onPress,
  onRespond,
  onEdit,
  onDelete,
  isOwner,
  isPremium,
}: { 
  invitation: Invitation;
  onPress: () => void;
  onRespond: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner: boolean;
  isPremium: boolean;
}) => {
  const eventDate = new Date(invitation.event_date);
  const formattedDate = eventDate.toLocaleDateString('es-ES', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardHeader}>
        <View style={styles.userPhotoContainer}>
          {invitation.user_photo ? (
            <Image source={{ uri: invitation.user_photo }} style={styles.userPhoto} />
          ) : (
            <View style={styles.userPhotoPlaceholder}>
              <Ionicons name="person" size={24} color={COLORS.text.muted} />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{invitation.user_name}</Text>
          {invitation.can_see_profile && (
            <View style={styles.userStats}>
              {invitation.user_rating && (
                <View style={styles.statItem}>
                  <Ionicons name="star" size={12} color={COLORS.gold.primary} />
                  <Text style={styles.statText}>{invitation.user_rating.toFixed(1)}</Text>
                </View>
              )}
              {invitation.user_vibes_received !== null && (
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={12} color="#FF6B6B" />
                  <Text style={styles.statText}>{invitation.user_vibes_received}</Text>
                </View>
              )}
            </View>
          )}
          {!invitation.can_see_profile && !isPremium && (
            <Text style={styles.lockedText}>Perfil bloqueado</Text>
          )}
        </View>

        <PaymentBadge type={invitation.payment_type} />
      </View>

      <Text style={styles.invitationText}>{invitation.text}</Text>

      <View style={styles.eventDetails}>
        <View style={styles.eventItem}>
          <Ionicons name="calendar" size={16} color={COLORS.gold.primary} />
          <Text style={styles.eventText}>{formattedDate}</Text>
        </View>
        {invitation.event_time && (
          <View style={styles.eventItem}>
            <Ionicons name="time" size={16} color={COLORS.gold.primary} />
            <Text style={styles.eventText}>{invitation.event_time}</Text>
          </View>
        )}
        {invitation.place_name && (
          <View style={styles.eventItem}>
            <Ionicons name="location" size={16} color={COLORS.gold.primary} />
            <Text style={styles.eventText} numberOfLines={1}>{invitation.place_name}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <View style={styles.responsesCount}>
          <Ionicons name="people" size={14} color={COLORS.text.muted} />
          <Text style={styles.responsesText}>{invitation.responses_count} interesados</Text>
        </View>
        
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Ionicons name="pencil" size={18} color={COLORS.gold.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.respondButton} onPress={onRespond}>
            <Text style={styles.respondButtonText}>Me interesa</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.text.dark} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Create/Edit Invitation Modal
const CreateInvitationModal = ({
  visible,
  onClose,
  onCreate,
  editingInvitation,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  editingInvitation?: Invitation | null;
}) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [paymentType, setPaymentType] = useState<'full' | 'half'>('half');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingInvitation) {
      setText(editingInvitation.text);
      setPaymentType(editingInvitation.payment_type);
      setEventDate(new Date(editingInvitation.event_date));
      setEventTime(editingInvitation.event_time || '');
      setPlaceName(editingInvitation.place_name || '');
    } else {
      setText('');
      setPaymentType('half');
      setEventDate(new Date());
      setEventTime('');
      setPlaceName('');
    }
  }, [editingInvitation, visible]);

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const formatDate = (date: Date) => {
    return `${dayNames[date.getDay()]} ${date.getDate()} de ${monthNames[date.getMonth()]}`;
  };

  const handleCreate = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Escribe tu plan');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        text: text.trim(),
        payment_type: paymentType,
        event_date: eventDate.toISOString().split('T')[0],
        event_time: eventTime || undefined,
        place_name: placeName || undefined,
      });
      setText('');
      setPaymentType('half');
      setEventDate(new Date());
      setEventTime('');
      setPlaceName('');
      setShowCalendar(false);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingInvitation ? 'Editar Invitación' : 'Nueva Invitación'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>¿Cuál es el plan?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ej: Quién mañana para el cine?"
              placeholderTextColor={COLORS.text.muted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
            />

            <Text style={styles.inputLabel}>¿Quién paga?</Text>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[styles.paymentOption, paymentType === 'full' && styles.paymentOptionActive]}
                onPress={() => setPaymentType('full')}
              >
                <View style={[styles.paymentIcon, paymentType === 'full' && styles.paymentIconFull]}>
                  <Ionicons name="wallet" size={24} color={paymentType === 'full' ? '#10B981' : COLORS.text.muted} />
                </View>
                <Text style={[styles.paymentOptionText, paymentType === 'full' && styles.paymentOptionTextActive]}>
                  Yo invito
                </Text>
                <Text style={styles.paymentOptionDesc}>Pagas todo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentOption, paymentType === 'half' && styles.paymentOptionActive]}
                onPress={() => setPaymentType('half')}
              >
                <View style={[styles.paymentIcon, paymentType === 'half' && styles.paymentIconHalf]}>
                  <Ionicons name="git-compare" size={24} color={paymentType === 'half' ? COLORS.gold.primary : COLORS.text.muted} />
                </View>
                <Text style={[styles.paymentOptionText, paymentType === 'half' && styles.paymentOptionTextActive]}>
                  50/50
                </Text>
                <Text style={styles.paymentOptionDesc}>Dividimos</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Fecha del evento</Text>
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <Ionicons name="calendar" size={20} color={COLORS.gold.primary} />
              <Text style={styles.dateButtonText}>{formatDate(eventDate)}</Text>
              <Ionicons 
                name={showCalendar ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={COLORS.text.muted} 
              />
            </TouchableOpacity>

            {showCalendar && (
              <SimpleCalendar
                selectedDate={eventDate}
                onSelectDate={(date) => {
                  setEventDate(date);
                  setShowCalendar(false);
                }}
              />
            )}

            <Text style={styles.inputLabel}>Hora (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 8:00 PM"
              placeholderTextColor={COLORS.text.muted}
              value={eventTime}
              onChangeText={setEventTime}
            />

            <Text style={styles.inputLabel}>Lugar (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cinépolis Perisur"
              placeholderTextColor={COLORS.text.muted}
              value={placeName}
              onChangeText={setPlaceName}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text.dark} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={COLORS.text.dark} />
                <Text style={styles.createButtonText}>
                  {editingInvitation ? 'Guardar Cambios' : 'Publicar Invitación'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function InvitationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'full' | 'half'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);

  const isPremium = user?.is_premium || false;
  const userId = user?.id;

  const loadInvitations = useCallback(async () => {
    try {
      const paymentType = filter === 'all' ? undefined : filter;
      const data = await api.getInvitations(paymentType, 50);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleRespond = async (invitation: Invitation) => {
    try {
      await api.respondToInvitation(invitation.id);
      Alert.alert(
        '¡Enviado!',
        `Tu interés fue enviado a ${invitation.user_name}. Te notificaremos si te acepta.`,
        [{ text: 'OK' }]
      );
      loadInvitations();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar tu respuesta');
    }
  };

  const handleCreateInvitation = async (data: any) => {
    if (editingInvitation) {
      // For now, delete and recreate (backend doesn't have update endpoint yet)
      await api.deleteInvitation(editingInvitation.id);
    }
    await api.createInvitation(data);
    Alert.alert('¡Publicado!', 'Tu invitación fue enviada a todos los usuarios');
    setEditingInvitation(null);
    loadInvitations();
  };

  const handleEdit = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setShowCreateModal(true);
  };

  const handleDelete = async (invitation: Invitation) => {
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
              await api.deleteInvitation(invitation.id);
              loadInvitations();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const handleViewInvitation = (invitation: Invitation) => {
    router.push({
      pathname: '/invitation/[id]',
      params: { id: invitation.id }
    });
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Invitaciones</Text>
          <Text style={styles.headerSubtitle}>¿Quién para...?</Text>
        </View>
        <TouchableOpacity 
          style={styles.myInvitationsButton}
          onPress={() => router.push('/invitation/my-invitations')}
        >
          <Ionicons name="list" size={20} color={COLORS.gold.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['all', 'full', 'half'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todas' : f === 'full' ? 'Yo invito' : '50/50'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
            <Text style={styles.emptyTitle}>No hay invitaciones</Text>
            <Text style={styles.emptySubtitle}>
              Sé el primero en publicar un plan
            </Text>
          </View>
        ) : (
          invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              onPress={() => handleViewInvitation(invitation)}
              onRespond={() => handleRespond(invitation)}
              onEdit={() => handleEdit(invitation)}
              onDelete={() => handleDelete(invitation)}
              isOwner={invitation.user_id === userId}
              isPremium={isPremium}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          setEditingInvitation(null);
          setShowCreateModal(true);
        }}
      >
        <LinearGradient
          colors={COLORS.gradients.goldButton as [string, string, string]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={COLORS.text.dark} />
        </LinearGradient>
      </TouchableOpacity>

      <CreateInvitationModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingInvitation(null);
        }}
        onCreate={handleCreateInvitation}
        editingInvitation={editingInvitation}
      />

      {/* Tour Tooltip */}
      <TourTooltip screen="invitations" />
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
    color: COLORS.text.muted,
    marginTop: 2,
  },
  myInvitationsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  filterButtonActive: {
    backgroundColor: COLORS.gold.primary,
    borderColor: COLORS.gold.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  filterTextActive: {
    color: COLORS.text.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userPhotoContainer: {
    marginRight: 12,
  },
  userPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  userStats: {
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
  lockedText: {
    fontSize: 11,
    color: COLORS.text.muted,
    fontStyle: 'italic',
    marginTop: 4,
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
  invitationText: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  responsesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  responsesText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  respondButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.dark,
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
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '90%',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
    marginTop: 16,
  },
  textArea: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  input: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  paymentOptionActive: {
    borderColor: COLORS.gold.primary,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentIconFull: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  paymentIconHalf: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  paymentOptionTextActive: {
    color: COLORS.text.primary,
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
  // Calendar styles
  calendarContainer: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarDayNames: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.muted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.gold.primary,
    borderRadius: 20,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: COLORS.gold.primary,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  calendarDayTextDisabled: {
    color: COLORS.text.muted,
  },
  calendarDayTextSelected: {
    color: COLORS.text.dark,
    fontWeight: '600',
  },
});

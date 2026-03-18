import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';
import { getVibeById } from '../../src/constants/vibes';

interface Chat {
  id: string;
  other_user: {
    id: string;
    name: string;
    photo_url?: string;
  };
  vibe_type?: string;
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
  expires_at: string;
  time_remaining_seconds: number;
  time_remaining_hours: number;
}

export default function ChatsListScreen() {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = async () => {
    try {
      const data = await api.getMyChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expirado';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const vibe = item.vibe_type ? getVibeById(item.vibe_type) : null;
    const timeRemaining = formatTimeRemaining(item.time_remaining_seconds);
    const isExpiringSoon = item.time_remaining_seconds < 3600; // Less than 1 hour

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => router.push(`/chats/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.other_user.photo_url ? (
            <Image
              source={{ uri: item.other_user.photo_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.other_user.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {vibe && (
            <View style={[styles.vibeBadge, { backgroundColor: vibe.color }]}>
              <Text style={styles.vibeEmoji}>{vibe.icon}</Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.other_user.name}
            </Text>
            {item.last_message && (
              <Text style={styles.timeText}>
                {formatTime(item.last_message.created_at)}
              </Text>
            )}
          </View>

          <View style={styles.chatPreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message?.content || 'Chat iniciado'}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>

          <View style={styles.expiryRow}>
            <Ionicons
              name="time-outline"
              size={12}
              color={isExpiringSoon ? '#FF6B6B' : COLORS.text.muted}
            />
            <Text style={[
              styles.expiryText,
              isExpiringSoon && styles.expiryTextUrgent
            ]}>
              {timeRemaining}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gold.primary} />
      </View>
      <Text style={styles.emptyTitle}>No tienes chats activos</Text>
      <Text style={styles.emptySubtitle}>
        Cuando alguien acepte tu Vibe, o tú aceptes uno, aparecerá un chat aquí.
      </Text>
      <Text style={styles.emptyNote}>
        Los chats desaparecen después de 24 horas ⏳
      </Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Mis Chats</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={COLORS.gold.primary} />
        <Text style={styles.infoText}>
          Los chats son temporales y desaparecen 24h después de conectar
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.gold.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            chats.length === 0 && styles.listEmpty
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.gold.primary}
            />
          }
        />
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  loader: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  listEmpty: {
    flex: 1,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  vibeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.card,
  },
  vibeEmoji: {
    fontSize: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginLeft: 8,
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.gold.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  expiryTextUrgent: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyNote: {
    fontSize: 14,
    color: COLORS.text.muted,
    textAlign: 'center',
  },
});

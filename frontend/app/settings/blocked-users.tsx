import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

interface BlockedUser {
  user_id: string;
  name: string;
  photo_url?: string;
  blocked_at: string;
}

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const data = await api.getBlockedUsers();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      'Desbloquear usuario',
      `Quieres desbloquear a ${user.name}? Podran verte y enviarte Vibes de nuevo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.unblockUser(user.user_id);
              setBlockedUsers(prev => prev.filter(u => u.user_id !== user.user_id));
            } catch (error) {
              Alert.alert('Error', 'No se pudo desbloquear al usuario');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const renderUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.blockedDate}>Bloqueado el {formatDate(item.blocked_at)}</Text>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item)}
      >
        <Text style={styles.unblockText}>Desbloquear</Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Usuarios bloqueados</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.gold.primary} style={styles.loader} />
      ) : blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.gold.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sin usuarios bloqueados</Text>
          <Text style={styles.emptySubtitle}>
            Los usuarios que bloquees apareceran aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  loader: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  blockedDate: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F44336',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

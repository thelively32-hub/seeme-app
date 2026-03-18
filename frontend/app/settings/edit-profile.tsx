import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';
import VibeSelector from '../../src/components/VibeSelector';
import { VIBES, getVibeById } from '../../src/constants/vibes';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photo, setPhoto] = useState<string | null>(user?.photo_url || null);
  const [loading, setSaving] = useState(false);
  const [showVibeSelector, setShowVibeSelector] = useState(false);
  const [currentVibe, setCurrentVibe] = useState(user?.current_vibe?.vibe_id || null);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = { 
        name: name.trim(),
        bio: bio.trim() || undefined,
      };
      
      // If photo was changed (local URI), we'd upload it here
      // For MVP, we just store the URI (in production you'd upload to cloud storage)
      if (photo && photo !== user?.photo_url) {
        updateData.photo_url = photo;
      }
      
      await api.updateProfile(updateData);
      await refreshUser();
      Alert.alert('¡Listo!', 'Perfil actualizado');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSetVibe = (vibeId: string, message: string) => {
    setCurrentVibe(vibeId);
    setShowVibeSelector(false);
    // TODO: Save vibe to backend
  };

  const selectedVibe = currentVibe ? getVibeById(currentVibe) : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.gold.primary} />
            ) : (
              <Text style={styles.saveText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={COLORS.gradients.goldButton as [string, string, string]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {name.charAt(0).toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color={COLORS.text.dark} />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Toca para cambiar foto</Text>
          </View>

          {/* Current Vibe */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mi Vibe de Hoy</Text>
            <TouchableOpacity 
              style={[
                styles.vibeCard,
                selectedVibe && { backgroundColor: `${selectedVibe.color}15`, borderColor: `${selectedVibe.color}50` }
              ]}
              onPress={() => setShowVibeSelector(true)}
            >
              {selectedVibe ? (
                <View style={styles.vibeContent}>
                  <Text style={styles.vibeEmoji}>{selectedVibe.icon}</Text>
                  <View>
                    <Text style={[styles.vibeLabel, { color: selectedVibe.color }]}>
                      {selectedVibe.labelEs}
                    </Text>
                    <Text style={styles.vibeMessage}>
                      "{selectedVibe.defaultMessageEs}"
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.vibeContent}>
                  <View style={styles.addVibeIcon}>
                    <Ionicons name="add" size={24} color={COLORS.gold.primary} />
                  </View>
                  <Text style={styles.addVibeText}>Establecer mi vibe</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={COLORS.text.muted}
              autoCapitalize="words"
            />
          </View>

          {/* Bio Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Cuéntanos algo sobre ti..."
              placeholderTextColor={COLORS.text.muted}
              multiline
              maxLength={150}
              numberOfLines={3}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          {/* Email (read-only) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>{user?.email}</Text>
              <Ionicons name="lock-closed" size={16} color={COLORS.text.muted} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Vibe Selector */}
      <VibeSelector
        visible={showVibeSelector}
        onClose={() => setShowVibeSelector(false)}
        onSend={handleSetVibe}
        recipientName="tu perfil"
      />
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gold.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.gold.primary,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background.primary,
  },
  changePhotoText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.background.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'right',
    marginTop: 6,
  },
  readOnlyInput: {
    backgroundColor: COLORS.background.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    opacity: 0.6,
  },
  readOnlyText: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  vibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  vibeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vibeEmoji: {
    fontSize: 40,
  },
  vibeLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  vibeMessage: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  addVibeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVibeText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});

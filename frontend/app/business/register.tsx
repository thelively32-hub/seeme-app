import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const BUSINESS_TYPES = ['Bar', 'Restaurante', 'Club', 'Café', 'Lounge', 'Otro'];

export default function RegisterBusinessScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState('Bar');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesita acceso a la ubicación');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      // Try to get address from coordinates
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode.length > 0) {
          const addr = geocode[0];
          const fullAddress = [
            addr.street,
            addr.streetNumber,
            addr.city,
            addr.region,
          ].filter(Boolean).join(', ');
          if (fullAddress && !address) {
            setAddress(fullAddress);
          }
        }
      } catch (e) {
        console.log('Geocode failed:', e);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del local es requerido');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'La dirección es requerida');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Debes obtener la ubicación del local');
      return;
    }

    setLoading(true);
    try {
      const result = await api.registerBusiness({
        name: name.trim(),
        type,
        address: address.trim(),
        latitude: location.lat,
        longitude: location.lng,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        description: description.trim() || undefined,
      });

      Alert.alert(
        '¡Registro exitoso! 🎉',
        'Tu local ha sido registrado. Ahora puedes ver y descargar tu código QR.',
        [
          {
            text: 'Ver mi QR',
            onPress: () => router.replace(`/business/${result.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No se pudo registrar el local'
      );
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim() && address.trim() && location;

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
          <Text style={styles.headerTitle}>Registrar Local</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Local *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Bar La Terraza"
              placeholderTextColor={COLORS.text.muted}
            />
          </View>

          {/* Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Local</Text>
            <View style={styles.typeContainer}>
              {BUSINESS_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    type === t && styles.typeChipSelected,
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[
                    styles.typeChipText,
                    type === t && styles.typeChipTextSelected,
                  ]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ubicación *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={COLORS.gold.primary} />
              ) : (
                <Ionicons 
                  name={location ? "checkmark-circle" : "location"} 
                  size={20} 
                  color={location ? "#4CAF50" : COLORS.gold.primary} 
                />
              )}
              <Text style={styles.locationButtonText}>
                {location ? 'Ubicación obtenida ✓' : 'Obtener mi ubicación actual'}
              </Text>
            </TouchableOpacity>
            {location && (
              <Text style={styles.locationCoords}>
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Dirección completa"
              placeholderTextColor={COLORS.text.muted}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 123 4567"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (opcional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="contacto@tulocal.com"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu local..."
              placeholderTextColor={COLORS.text.muted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, !isValid && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={!isValid || loading}
          >
            <LinearGradient
              colors={isValid ? COLORS.gradients.goldButton as [string, string, string] : ['#3A3A3A', '#2A2A2A', '#1A1A1A']}
              style={styles.registerButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={isValid ? COLORS.text.dark : COLORS.text.muted} />
              ) : (
                <Text style={[
                  styles.registerButtonText,
                  !isValid && styles.registerButtonTextDisabled,
                ]}>
                  Registrar Local
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'right',
    marginTop: 6,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  typeChipSelected: {
    backgroundColor: COLORS.gold.primary,
    borderColor: COLORS.gold.primary,
  },
  typeChipText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: COLORS.text.dark,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
  },
  locationButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  locationCoords: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  registerButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 12,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  registerButtonTextDisabled: {
    color: COLORS.text.muted,
  },
});

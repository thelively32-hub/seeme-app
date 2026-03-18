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
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

export default function SafetyScreen() {
  const insets = useSafeAreaInsets();
  const [emergencyContact, setEmergencyContact] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_submitted');
  const [loading, setLoading] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [saving, setSaving] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contact, verification] = await Promise.all([
        api.getEmergencyContact().catch(() => null),
        api.getVerificationStatus().catch(() => ({ status: 'not_submitted' })),
      ]);
      setEmergencyContact(contact);
      setVerificationStatus(verification?.status || 'not_submitted');
      if (contact) {
        setContactName(contact.name);
        setContactPhone(contact.phone);
        setContactRelation(contact.relationship || '');
      }
    } catch (error) {
      console.error('Error loading safety data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Error', 'Nombre y telefono son requeridos');
      return;
    }
    
    setSaving(true);
    try {
      await api.setEmergencyContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelation.trim() || undefined,
      });
      setEmergencyContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelation.trim(),
      });
      setShowContactForm(false);
      Alert.alert('Guardado', 'Contacto de emergencia actualizado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el contacto');
    } finally {
      setSaving(false);
    }
  };

  const handleShareLocation = async () => {
    const message = `Estoy usando SEE ME para conocer gente. Te aviso por si necesitas contactarme. - Enviado desde SEE ME`;
    
    try {
      await Share.share({
        message,
        title: 'SEE ME - Compartir ubicacion',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleVerifyPhoto = () => {
    router.push('/settings/verify-photo');
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return { icon: 'checkmark-circle', color: '#4CAF50', text: 'Verificado' };
      case 'pending':
        return { icon: 'time', color: '#FF9800', text: 'En revision' };
      default:
        return { icon: 'alert-circle', color: COLORS.text.muted, text: 'No verificado' };
    }
  };

  const badge = getVerificationBadge();

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
        <Text style={styles.headerTitle}>Seguridad</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Safety Banner */}
        <View style={styles.banner}>
          <Ionicons name="shield-checkmark" size={32} color={COLORS.gold.primary} />
          <Text style={styles.bannerTitle}>Tu seguridad es nuestra prioridad</Text>
          <Text style={styles.bannerText}>
            Configura tus opciones de seguridad para una mejor experiencia
          </Text>
        </View>

        {/* Verification Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VERIFICACION DE PERFIL</Text>
          <TouchableOpacity style={styles.verificationCard} onPress={handleVerifyPhoto}>
            <View style={[styles.verificationBadge, { backgroundColor: `${badge.color}20` }]}>
              <Ionicons name={badge.icon as any} size={24} color={badge.color} />
            </View>
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationTitle}>Estado: {badge.text}</Text>
              <Text style={styles.verificationSubtitle}>
                {verificationStatus === 'verified'
                  ? 'Tu perfil esta verificado con foto'
                  : 'Verifica tu perfil con una selfie'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACTO DE EMERGENCIA</Text>
          
          {emergencyContact && !showContactForm ? (
            <View style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name="person-circle" size={40} color={COLORS.gold.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{emergencyContact.name}</Text>
                <Text style={styles.contactPhone}>{emergencyContact.phone}</Text>
                {emergencyContact.relationship && (
                  <Text style={styles.contactRelation}>{emergencyContact.relationship}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowContactForm(true)}
              >
                <Ionicons name="pencil" size={18} color={COLORS.gold.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contactForm}>
              <TextInput
                style={styles.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Nombre del contacto"
                placeholderTextColor={COLORS.text.muted}
              />
              <TextInput
                style={styles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Telefono"
                placeholderTextColor={COLORS.text.muted}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                value={contactRelation}
                onChangeText={setContactRelation}
                placeholder="Relacion (opcional): Amigo, Familia..."
                placeholderTextColor={COLORS.text.muted}
              />
              <View style={styles.formButtons}>
                {emergencyContact && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowContactForm(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveButton, (!contactName || !contactPhone) && styles.saveButtonDisabled]}
                  onPress={handleSaveContact}
                  disabled={!contactName || !contactPhone || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.text.dark} />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCIONES RAPIDAS</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={handleShareLocation}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
              <Ionicons name="share-social" size={22} color="#2196F3" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Compartir mi cita</Text>
              <Text style={styles.actionSubtitle}>Envia tu ubicacion a un contacto de confianza</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/settings/blocked-users')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 67, 54, 0.15)' }]}>
              <Ionicons name="ban" size={22} color="#F44336" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Usuarios bloqueados</Text>
              <Text style={styles.actionSubtitle}>Ver y gestionar usuarios bloqueados</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Consejos de seguridad</Text>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.gold.primary} />
            <Text style={styles.tipText}>Siempre conoce personas en lugares publicos</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.gold.primary} />
            <Text style={styles.tipText}>Avisa a alguien de confianza antes de una cita</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.gold.primary} />
            <Text style={styles.tipText}>Confia en tu instinto, si algo no se siente bien, vete</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.gold.primary} />
            <Text style={styles.tipText}>No compartas informacion personal sensible</Text>
          </View>
        </View>
      </ScrollView>
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
  banner: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
    marginBottom: 24,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  bannerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.muted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  verificationBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  verificationSubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  contactIcon: {
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  contactPhone: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  contactRelation: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  contactForm: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  input: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cancelButtonText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.gold.primary,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.background.tertiary,
  },
  saveButtonText: {
    fontSize: 15,
    color: COLORS.text.dark,
    fontWeight: '700',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  tipsSection: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

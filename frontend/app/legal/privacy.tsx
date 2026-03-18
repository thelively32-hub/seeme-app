import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import COLORS from '../../src/theme/colors';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.headerTitle}>Política de Privacidad</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Última actualización: Junio 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Privacidad es Importante</Text>
          <Text style={styles.sectionText}>
            En See Me, nos tomamos muy en serio la protección de tus datos personales. Esta política explica qué información recopilamos y cómo la usamos.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información que Recopilamos</Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>Información de cuenta:</Text>{"\n"}
            • Nombre, email, número de teléfono{"\n"}
            • Fecha de nacimiento (para verificar edad){"\n"}
            • Foto de perfil (opcional){"\n"}
            {"\n"}
            <Text style={styles.bold}>Información de uso:</Text>{"\n"}
            • Ubicación (solo durante check-ins){"\n"}
            • Historial de check-ins{"\n"}
            • Vibes enviados y recibidos
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cómo Usamos tu Información</Text>
          <Text style={styles.sectionText}>
            • Mostrar tu perfil a otros usuarios{"\n"}
            • Verificar tu ubicación durante check-ins{"\n"}
            • Mostrarte personas cerca de ti{"\n"}
            • Enviar notificaciones sobre vibes{"\n"}
            • Mejorar la experiencia de la app
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Ubicación</Text>
          <Text style={styles.sectionText}>
            • Solo accedemos a tu ubicación cuando haces check-in{"\n"}
            • No rastreamos tu ubicación en segundo plano{"\n"}
            • Puedes desactivar los permisos en cualquier momento{"\n"}
            • La ubicación se usa para verificar que estás en el lugar
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Control de tu Información</Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>Modo Fantasma (Premium):</Text>{"\n"}
            Navega perfiles sin que otros sepan que los viste.{"\n"}
            {"\n"}
            <Text style={styles.bold}>Eliminar cuenta:</Text>{"\n"}
            Puedes eliminar tu cuenta y todos tus datos desde Configuración.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compartimos tu Información</Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>NO vendemos</Text> tu información personal.{"\n"}
            {"\n"}
            Solo compartimos datos con:{"\n"}
            • Otros usuarios (según tu configuración){"\n"}
            • Proveedores de servicios (hosting, pagos){"\n"}
            • Autoridades (si es requerido por ley)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <Text style={styles.sectionText}>
            • Encriptación de datos en tránsito{"\n"}
            • Contraseñas hasheadas de forma segura{"\n"}
            • Acceso restringido a datos personales{"\n"}
            • Monitoreo de actividad sospechosa
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <Text style={styles.sectionText}>
            Para consultas sobre privacidad:{"\n"}
            privacy@seeme.app
          </Text>
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
  lastUpdated: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gold.primary,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

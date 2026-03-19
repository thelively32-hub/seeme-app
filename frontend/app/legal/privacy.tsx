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

export default function PrivacyPolicyScreen() {
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
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Última actualización: Marzo 2025</Text>

        <Text style={styles.sectionTitle}>1. Información que Recopilamos</Text>
        <Text style={styles.paragraph}>
          SEE ME recopila la siguiente información para proporcionar nuestros servicios:
        </Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Número de teléfono:</Text> Para verificar tu identidad y crear tu cuenta.</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Información de perfil:</Text> Nombre, edad, género, fotos y preferencias que proporcionas voluntariamente.</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Ubicación:</Text> Para mostrarte personas y lugares cercanos, y verificar check-ins.</Text>
        <Text style={styles.bullet}>• <Text style={styles.bold}>Contenido:</Text> Mensajes, fotos y vibes que envías a otros usuarios.</Text>

        <Text style={styles.sectionTitle}>2. Cómo Usamos tu Información</Text>
        <Text style={styles.paragraph}>
          Utilizamos tu información para:
        </Text>
        <Text style={styles.bullet}>• Proporcionar y mejorar nuestros servicios</Text>
        <Text style={styles.bullet}>• Conectarte con otros usuarios cercanos</Text>
        <Text style={styles.bullet}>• Verificar tu ubicación para check-ins</Text>
        <Text style={styles.bullet}>• Enviarte notificaciones sobre vibes y mensajes</Text>
        <Text style={styles.bullet}>• Garantizar la seguridad de la plataforma</Text>

        <Text style={styles.sectionTitle}>3. Compartir Información</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Tu perfil público</Text> (nombre, edad, foto) es visible para otros usuarios cercanos o en el mismo lugar.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>No vendemos</Text> tu información personal a terceros.
        </Text>
        <Text style={styles.paragraph}>
          Podemos compartir información con proveedores de servicios que nos ayudan a operar la app (ej: Firebase, Cloudinary).
        </Text>

        <Text style={styles.sectionTitle}>4. Ubicación</Text>
        <Text style={styles.paragraph}>
          Usamos tu ubicación para:
        </Text>
        <Text style={styles.bullet}>• Mostrarte usuarios en lugares cercanos</Text>
        <Text style={styles.bullet}>• Verificar que estás físicamente en un lugar para hacer check-in</Text>
        <Text style={styles.bullet}>• Mostrar tu presencia a otros usuarios (puedes usar Modo Fantasma para ocultarte)</Text>
        <Text style={styles.paragraph}>
          Puedes desactivar la ubicación en cualquier momento desde la configuración de tu dispositivo.
        </Text>

        <Text style={styles.sectionTitle}>5. Seguridad</Text>
        <Text style={styles.paragraph}>
          Implementamos medidas de seguridad para proteger tu información, incluyendo encriptación de datos y autenticación segura.
        </Text>

        <Text style={styles.sectionTitle}>6. Retención de Datos</Text>
        <Text style={styles.paragraph}>
          • Los mensajes de chat se eliminan automáticamente después de 24 horas.
        </Text>
        <Text style={styles.paragraph}>
          • Puedes eliminar tu cuenta en cualquier momento desde Configuración.
        </Text>

        <Text style={styles.sectionTitle}>7. Tus Derechos</Text>
        <Text style={styles.paragraph}>
          Tienes derecho a:
        </Text>
        <Text style={styles.bullet}>• Acceder a tus datos personales</Text>
        <Text style={styles.bullet}>• Corregir información incorrecta</Text>
        <Text style={styles.bullet}>• Eliminar tu cuenta y datos</Text>
        <Text style={styles.bullet}>• Bloquear y reportar usuarios</Text>

        <Text style={styles.sectionTitle}>8. Menores de Edad</Text>
        <Text style={styles.paragraph}>
          SEE ME está diseñado para usuarios mayores de 18 años. No recopilamos intencionalmente información de menores.
        </Text>

        <Text style={styles.sectionTitle}>9. Cambios a esta Política</Text>
        <Text style={styles.paragraph}>
          Podemos actualizar esta política ocasionalmente. Te notificaremos sobre cambios significativos a través de la app.
        </Text>

        <Text style={styles.sectionTitle}>10. Contacto</Text>
        <Text style={styles.paragraph}>
          Si tienes preguntas sobre esta política, contáctanos en:
        </Text>
        <Text style={styles.contactEmail}>privacy@seeme.app</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gold.primary,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 24,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  contactEmail: {
    fontSize: 16,
    color: COLORS.gold.primary,
    fontWeight: '600',
    marginTop: 8,
  },
});

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

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Términos de Servicio</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Última actualización: Marzo 2025</Text>

        <Text style={styles.sectionTitle}>1. Aceptación de los Términos</Text>
        <Text style={styles.paragraph}>
          Al usar SEE ME, aceptas estos términos de servicio. Si no estás de acuerdo, no uses la aplicación.
        </Text>

        <Text style={styles.sectionTitle}>2. Elegibilidad</Text>
        <Text style={styles.paragraph}>
          Para usar SEE ME debes:
        </Text>
        <Text style={styles.bullet}>• Tener al menos 18 años de edad</Text>
        <Text style={styles.bullet}>• No estar prohibido de usar el servicio</Text>
        <Text style={styles.bullet}>• Proporcionar información veraz</Text>

        <Text style={styles.sectionTitle}>3. Tu Cuenta</Text>
        <Text style={styles.paragraph}>
          Eres responsable de mantener la seguridad de tu cuenta y de todas las actividades que ocurran bajo ella.
        </Text>
        <Text style={styles.paragraph}>
          No compartas tu cuenta ni permitas que otros la usen.
        </Text>

        <Text style={styles.sectionTitle}>4. Conducta del Usuario</Text>
        <Text style={styles.paragraph}>
          Al usar SEE ME, te comprometes a NO:
        </Text>
        <Text style={styles.bullet}>• Acosar, amenazar o intimidar a otros usuarios</Text>
        <Text style={styles.bullet}>• Publicar contenido ilegal, ofensivo o inapropiado</Text>
        <Text style={styles.bullet}>• Hacerte pasar por otra persona</Text>
        <Text style={styles.bullet}>• Usar la app con fines comerciales no autorizados</Text>
        <Text style={styles.bullet}>• Intentar acceder a cuentas de otros usuarios</Text>
        <Text style={styles.bullet}>• Enviar spam o contenido no solicitado</Text>
        <Text style={styles.bullet}>• Usar bots o sistemas automatizados</Text>

        <Text style={styles.sectionTitle}>5. Contenido</Text>
        <Text style={styles.paragraph}>
          Eres responsable del contenido que publicas. Al subir fotos o enviar mensajes, garantizas que tienes derecho a compartir ese contenido.
        </Text>
        <Text style={styles.paragraph}>
          Nos reservamos el derecho de eliminar contenido que viole estos términos.
        </Text>

        <Text style={styles.sectionTitle}>6. Sistema de Vibes</Text>
        <Text style={styles.paragraph}>
          Los "Vibes" son invitaciones para conectar con otros usuarios. Al enviar un Vibe, entiendes que:
        </Text>
        <Text style={styles.bullet}>• El receptor puede aceptar o rechazar libremente</Text>
        <Text style={styles.bullet}>• Los chats tienen una duración de 24 horas</Text>
        <Text style={styles.bullet}>• Debes respetar a los demás usuarios</Text>

        <Text style={styles.sectionTitle}>7. Ubicación y Presencia</Text>
        <Text style={styles.paragraph}>
          SEE ME usa tu ubicación para mostrar tu presencia en lugares. Al hacer check-in, otros usuarios podrán ver que estás en ese lugar.
        </Text>
        <Text style={styles.paragraph}>
          Puedes usar el Modo Fantasma (Premium) para navegar de forma invisible.
        </Text>

        <Text style={styles.sectionTitle}>8. Suscripciones Premium</Text>
        <Text style={styles.paragraph}>
          SEE ME ofrece suscripciones de pago con beneficios adicionales:
        </Text>
        <Text style={styles.bullet}>• Las suscripciones se renuevan automáticamente</Text>
        <Text style={styles.bullet}>• Puedes cancelar en cualquier momento desde la configuración de tu tienda de aplicaciones</Text>
        <Text style={styles.bullet}>• No hay reembolsos por períodos parciales</Text>

        <Text style={styles.sectionTitle}>9. Seguridad</Text>
        <Text style={styles.paragraph}>
          Nos tomamos la seguridad muy en serio. Puedes:
        </Text>
        <Text style={styles.bullet}>• Bloquear usuarios que te molesten</Text>
        <Text style={styles.bullet}>• Reportar comportamiento inapropiado</Text>
        <Text style={styles.bullet}>• Configurar contactos de emergencia</Text>
        <Text style={styles.paragraph}>
          Investigamos todos los reportes y tomamos acciones apropiadas.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitación de Responsabilidad</Text>
        <Text style={styles.paragraph}>
          SEE ME se proporciona "tal cual". No garantizamos:
        </Text>
        <Text style={styles.bullet}>• Que encontrarás conexiones</Text>
        <Text style={styles.bullet}>• La veracidad de la información de otros usuarios</Text>
        <Text style={styles.bullet}>• Disponibilidad continua del servicio</Text>
        <Text style={styles.paragraph}>
          No somos responsables por las interacciones entre usuarios fuera de la app.
        </Text>

        <Text style={styles.sectionTitle}>11. Terminación</Text>
        <Text style={styles.paragraph}>
          Podemos suspender o terminar tu cuenta si violas estos términos. Tú puedes eliminar tu cuenta en cualquier momento desde Configuración.
        </Text>

        <Text style={styles.sectionTitle}>12. Cambios a los Términos</Text>
        <Text style={styles.paragraph}>
          Podemos modificar estos términos. Te notificaremos sobre cambios importantes. El uso continuado después de los cambios implica aceptación.
        </Text>

        <Text style={styles.sectionTitle}>13. Contacto</Text>
        <Text style={styles.paragraph}>
          Para preguntas sobre estos términos:
        </Text>
        <Text style={styles.contactEmail}>legal@seeme.app</Text>
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
  contactEmail: {
    fontSize: 16,
    color: COLORS.gold.primary,
    fontWeight: '600',
    marginTop: 8,
  },
});

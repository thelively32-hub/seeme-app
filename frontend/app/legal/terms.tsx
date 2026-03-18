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
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Última actualización: Junio 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Aceptación de Términos</Text>
          <Text style={styles.sectionText}>
            Al usar See Me, aceptas estos términos. Si no estás de acuerdo, por favor no uses la app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Uso de la App</Text>
          <Text style={styles.sectionText}>
            • Debes tener al menos 18 años{"\n"}
            • Tu cuenta es personal e intransferible{"\n"}
            • Debes proporcionar información veraz{"\n"}
            • No uses la app para actividades ilegales
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Conducta del Usuario</Text>
          <Text style={styles.sectionText}>
            Los usuarios se comprometen a:{"\n"}
            • Ser respetuosos con otros usuarios{"\n"}
            • No acosar ni enviar contenido ofensivo{"\n"}
            • No hacer spam ni publicidad{"\n"}
            • Reportar comportamientos inapropiados
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Sistema de Vibes</Text>
          <Text style={styles.sectionText}>
            Los "Vibes" son el sistema de comunicación de See Me. Al enviar un vibe:{"\n"}
            • Aceptas que el destinatario vea tu perfil{"\n"}
            • Los vibes expiran en 24 horas{"\n"}
            • El destinatario puede aceptar o rechazar
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Check-ins y Ubicación</Text>
          <Text style={styles.sectionText}>
            Al hacer check-in:{"\n"}
            • Tu ubicación se verifica por GPS{"\n"}
            • Otros usuarios pueden verte en ese lugar{"\n"}
            • Puedes controlar tu visibilidad en ajustes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Suscripciones</Text>
          <Text style={styles.sectionText}>
            • Plan gratuito: funciones básicas limitadas{"\n"}
            • Plan Premium: funciones completas{"\n"}
            • Los pagos se procesan de forma segura{"\n"}
            • Puedes cancelar en cualquier momento
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Terminación</Text>
          <Text style={styles.sectionText}>
            Podemos suspender o eliminar cuentas que violen estos términos. Puedes eliminar tu cuenta en cualquier momento desde Configuración.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contacto</Text>
          <Text style={styles.sectionText}>
            Para dudas sobre estos términos:{"\n"}
            legal@seeme.app
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
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

type Gender = 'man' | 'woman' | 'nonbinary';
type LookingFor = 'men' | 'women' | 'everyone';
type Intention = 'friendship' | 'dating' | 'casual';

const GenderOption = ({
  label,
  emoji,
  selected,
  onPress,
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.genderOption, selected && styles.genderOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.genderEmoji}>{emoji}</Text>
    <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>{label}</Text>
  </TouchableOpacity>
);

const ChipOption = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const IntentionOption = ({
  label,
  emoji,
  description,
  selected,
  onPress,
}: {
  label: string;
  emoji: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.intentionOption, selected && styles.intentionOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.intentionEmoji}>{emoji}</Text>
    <View style={styles.intentionInfo}>
      <Text style={[styles.intentionLabel, selected && styles.intentionLabelSelected]}>{label}</Text>
      <Text style={styles.intentionDescription}>{description}</Text>
    </View>
    {selected && (
      <Ionicons name="checkmark-circle" size={24} color={COLORS.gold.primary} />
    )}
  </TouchableOpacity>
);

export default function SetVibeScreen() {
  const insets = useSafeAreaInsets();
  const { setVibe } = useAuth();
  
  const [gender, setGender] = useState<Gender | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
  const [intention, setIntention] = useState<Intention | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLookingFor = (option: LookingFor) => {
    if (option === 'everyone') {
      setLookingFor(['everyone']);
    } else {
      const newLookingFor = lookingFor.filter(l => l !== 'everyone');
      if (newLookingFor.includes(option)) {
        setLookingFor(newLookingFor.filter(l => l !== option));
      } else {
        setLookingFor([...newLookingFor, option]);
      }
    }
  };

  const handleContinue = async () => {
    if (!gender || lookingFor.length === 0 || !intention) {
      setError('Por favor completa todas las opciones');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await setVibe(gender, lookingFor, intention);
      router.replace('/(tabs)/explore');
    } catch (e: any) {
      setError(e.message || 'Error al guardar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = gender && lookingFor.length > 0 && intention;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
        </TouchableOpacity>

        <Text style={styles.title}>Configura tu Vibe</Text>
        <Text style={styles.subtitle}>
          Ayúdanos a mostrarte personas afines a ti en los lugares que visites.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Your Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soy</Text>
          <View style={styles.genderContainer}>
            <GenderOption
              label="Hombre"
              emoji="👨"
              selected={gender === 'man'}
              onPress={() => setGender('man')}
            />
            <GenderOption
              label="Mujer"
              emoji="👩"
              selected={gender === 'woman'}
              onPress={() => setGender('woman')}
            />
            <GenderOption
              label="Otro"
              emoji="🧑"
              selected={gender === 'nonbinary'}
              onPress={() => setGender('nonbinary')}
            />
          </View>
        </View>

        {/* Looking For */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Me interesa conocer</Text>
          <View style={styles.chipsContainer}>
            <ChipOption
              label="Hombres"
              selected={lookingFor.includes('men')}
              onPress={() => toggleLookingFor('men')}
            />
            <ChipOption
              label="Mujeres"
              selected={lookingFor.includes('women')}
              onPress={() => toggleLookingFor('women')}
            />
            <ChipOption
              label="Todos"
              selected={lookingFor.includes('everyone')}
              onPress={() => toggleLookingFor('everyone')}
            />
          </View>
        </View>

        {/* Intention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Busco principalmente</Text>
          <View style={styles.intentionsContainer}>
            <IntentionOption
              label="Amistad"
              emoji="🤝"
              description="Conocer gente nueva, sin compromisos"
              selected={intention === 'friendship'}
              onPress={() => setIntention('friendship')}
            />
            <IntentionOption
              label="Relación"
              emoji="💕"
              description="Abierto/a a algo más serio"
              selected={intention === 'dating'}
              onPress={() => setIntention('dating')}
            />
            <IntentionOption
              label="Casual"
              emoji="😎"
              description="Solo pasarla bien, sin etiquetas"
              selected={intention === 'casual'}
              onPress={() => setIntention('casual')}
            />
          </View>
        </View>

        {/* Continue Button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueButtonWrapper, !isComplete && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!isComplete || loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isComplete ? COLORS.gradients.goldButton as [string, string, string] : ['#3A3A3A', '#2A2A2A', '#1A1A1A']}
              style={styles.continueButton}
            >
              {loading ? (
                <ActivityIndicator color={isComplete ? COLORS.text.dark : COLORS.text.muted} />
              ) : (
                <Text style={[styles.continueButtonText, !isComplete && styles.continueButtonTextDisabled]}>
                  Continuar
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  errorText: {
    color: COLORS.accent.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  genderOptionSelected: {
    borderColor: COLORS.gold.primary,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
  },
  genderEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  genderLabel: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  genderLabelSelected: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: COLORS.background.card,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.gold.primary,
    borderColor: COLORS.gold.primary,
  },
  chipText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.text.dark,
    fontWeight: '600',
  },
  intentionsContainer: {
    gap: 12,
  },
  intentionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    gap: 14,
  },
  intentionOptionSelected: {
    borderColor: COLORS.gold.primary,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
  },
  intentionEmoji: {
    fontSize: 32,
  },
  intentionInfo: {
    flex: 1,
  },
  intentionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  intentionLabelSelected: {
    color: COLORS.gold.primary,
  },
  intentionDescription: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  continueButtonWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  continueButtonTextDisabled: {
    color: COLORS.text.muted,
  },
});

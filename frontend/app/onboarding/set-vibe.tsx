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

const { width } = Dimensions.get('window');

type Gender = 'man' | 'woman' | 'nonbinary';
type LookingFor = 'men' | 'women' | 'everyone';
type Intention = 'friends' | 'date' | 'casual';

const GenderOption = ({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.genderOption, selected && styles.genderOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.genderIconContainer, selected && styles.genderIconSelected]}>
      <Ionicons name={icon as any} size={32} color={selected ? '#fff' : 'rgba(255,255,255,0.6)'} />
    </View>
    <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>{label}</Text>
  </TouchableOpacity>
);

const ChipOption = ({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    style={[
      styles.chip,
      selected && { backgroundColor: color || '#ff7b35', borderColor: color || '#ff7b35' },
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const IntentionOption = ({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.intentionOption, selected && styles.intentionOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.intentionIconContainer, selected && styles.intentionIconSelected]}>
      <Ionicons name={icon as any} size={28} color={selected ? '#fff' : 'rgba(255,255,255,0.6)'} />
    </View>
    <Text style={[styles.intentionLabel, selected && styles.intentionLabelSelected]}>{label}</Text>
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
      setError('Please complete all selections');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await setVibe(gender, lookingFor, intention);
      router.replace('/(tabs)/explore');
    } catch (e: any) {
      setError(e.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = gender && lookingFor.length > 0 && intention;

  return (
    <LinearGradient colors={['#1a0a2e', '#0d0415']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Set Your Vibe</Text>
        <Text style={styles.subtitle}>Let others know what you're looking for</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Your Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your gender</Text>
          <View style={styles.genderContainer}>
            <GenderOption
              label="Man"
              icon="man"
              selected={gender === 'man'}
              onPress={() => setGender('man')}
            />
            <GenderOption
              label="Woman"
              icon="woman"
              selected={gender === 'woman'}
              onPress={() => setGender('woman')}
            />
            <GenderOption
              label="Other"
              icon="transgender"
              selected={gender === 'nonbinary'}
              onPress={() => setGender('nonbinary')}
            />
          </View>
        </View>

        {/* Looking For */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking for</Text>
          <View style={styles.chipsContainer}>
            <ChipOption
              label="Men"
              selected={lookingFor.includes('men')}
              onPress={() => toggleLookingFor('men')}
              color="#ffc107"
            />
            <ChipOption
              label="Women"
              selected={lookingFor.includes('women')}
              onPress={() => toggleLookingFor('women')}
              color="#e040fb"
            />
            <ChipOption
              label="Everyone"
              selected={lookingFor.includes('everyone')}
              onPress={() => toggleLookingFor('everyone')}
            />
          </View>
        </View>

        {/* What are you looking for */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are you looking for?</Text>
          <View style={styles.intentionContainer}>
            <IntentionOption
              label="Friends"
              icon="people"
              selected={intention === 'friends'}
              onPress={() => setIntention('friends')}
            />
            <IntentionOption
              label="Date"
              icon="heart"
              selected={intention === 'date'}
              onPress={() => setIntention('date')}
            />
            <IntentionOption
              label="Casual"
              icon="flame"
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
              colors={isComplete ? ['#ffaa40', '#ff7b35', '#ff5533'] : ['#555', '#444']}
              style={styles.continueButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
  },
  errorText: {
    color: '#ff5555',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    alignItems: 'center',
    width: (width - 80) / 3,
  },
  genderOptionSelected: {},
  genderIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  genderIconSelected: {
    backgroundColor: 'rgba(255, 123, 53, 0.3)',
    borderColor: '#ff7b35',
  },
  genderLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  genderLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  intentionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intentionOption: {
    alignItems: 'center',
    width: (width - 80) / 3,
  },
  intentionOptionSelected: {},
  intentionIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  intentionIconSelected: {
    backgroundColor: 'rgba(236, 64, 122, 0.3)',
    borderColor: '#ec407a',
  },
  intentionLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  intentionLabelSelected: {
    color: '#fff',
    fontWeight: '600',
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
    opacity: 0.6,
  },
  continueButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

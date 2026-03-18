import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function CreateProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: name, 2: birthday, 3: photo
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const formatBirthdate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const handleBirthdateChange = (text: string) => {
    setBirthdate(formatBirthdate(text));
  };

  const calculateAge = (dateString: string): number => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return 0;
    const birthDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permission to access photos is required');
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

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Permission to access camera is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (name.trim().length < 2) {
        setError('Please enter your name');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      const age = calculateAge(birthdate);
      if (age < 18) {
        setError('You must be 18 or older to use See Me');
        return;
      }
      if (age > 100 || birthdate.length < 10) {
        setError('Please enter a valid date');
        return;
      }
      setError('');
      setStep(3);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Create account with collected data
      // For now, using email-based signup with generated email
      const generatedEmail = `user_${Date.now()}@seeme.app`;
      const generatedPassword = `temp_${Date.now()}`;
      
      await signup(name, generatedEmail, generatedPassword);
      router.replace('/onboarding/set-vibe');
    } catch (e: any) {
      setError(e.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              This is how you'll appear on See Me
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Your first name"
                placeholderTextColor={COLORS.text.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />
            </View>
          </>
        );
      
      case 2:
        return (
          <>
            <Text style={styles.title}>When's your birthday?</Text>
            <Text style={styles.subtitle}>
              Your age will be shown on your profile
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={COLORS.text.muted}
                value={birthdate}
                onChangeText={handleBirthdateChange}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
              />
            </View>
            {birthdate.length === 10 && (
              <Text style={styles.ageText}>
                You are {calculateAge(birthdate)} years old
              </Text>
            )}
          </>
        );
      
      case 3:
        return (
          <>
            <Text style={styles.title}>Add your best photo</Text>
            <Text style={styles.subtitle}>
              Show the world your vibe
            </Text>
            
            <View style={styles.photoSection}>
              {photo ? (
                <TouchableOpacity onPress={pickImage} style={styles.photoPreview}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <View style={styles.photoEditBadge}>
                    <Ionicons name="camera" size={16} color={COLORS.text.dark} />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoOptions}>
                  <TouchableOpacity style={styles.photoOption} onPress={takePhoto}>
                    <View style={styles.photoOptionIcon}>
                      <Ionicons name="camera" size={32} color={COLORS.gold.primary} />
                    </View>
                    <Text style={styles.photoOptionText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.photoOption} onPress={pickImage}>
                    <View style={styles.photoOptionIcon}>
                      <Ionicons name="images" size={32} color={COLORS.gold.primary} />
                    </View>
                    <Text style={styles.photoOptionText}>Choose from Library</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        );
    }
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return birthdate.length === 10 && calculateAge(birthdate) >= 18;
    if (step === 3) return true; // Photo is optional
    return false;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${(step / 3) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{step} of 3</Text>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => step > 1 ? setStep(step - 1) : router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>

          {/* Step Content */}
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {renderStep()}
          </Animated.View>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={COLORS.accent.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Continue/Complete Button */}
          <TouchableOpacity
            style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]}
            onPress={step === 3 ? handleComplete : handleNext}
            disabled={!canProceed() || loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canProceed() ? COLORS.gradients.goldButton : ['#3A3A3A', '#2A2A2A']}
              style={styles.continueButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text.dark} />
              ) : (
                <Text style={[
                  styles.continueButtonText,
                  !canProceed() && styles.continueButtonTextDisabled,
                ]}>
                  {step === 3 ? "Let's Go" : 'Continue'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {step === 3 && !photo && (
            <TouchableOpacity onPress={handleComplete} disabled={loading}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.background.card,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8,
  },
  stepContent: {
    marginTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 18,
    color: COLORS.text.primary,
    paddingVertical: 18,
    fontWeight: '500',
  },
  ageText: {
    fontSize: 15,
    color: COLORS.gold.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  photoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  photoOptions: {
    width: '100%',
    gap: 16,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  photoOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  photoPreview: {
    position: 'relative',
  },
  photoImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: COLORS.gold.primary,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  errorText: {
    color: COLORS.accent.error,
    fontSize: 14,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.bright,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.dark,
    letterSpacing: 0.5,
  },
  continueButtonTextDisabled: {
    color: COLORS.text.muted,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});

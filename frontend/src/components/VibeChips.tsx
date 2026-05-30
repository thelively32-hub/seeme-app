import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import COLORS from '../theme/colors';

interface VibeChip {
  id: string;
  label: string;
  emoji: string;
}

const AVAILABLE_VIBES: VibeChip[] = [
  { id: 'social', label: 'Social', emoji: '🔥' },
  { id: 'wine', label: 'Wine Lover', emoji: '🍷' },
  { id: 'house', label: 'House Music', emoji: '🎵' },
  { id: 'standup', label: 'Stand Up', emoji: '🎤' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'foodie', label: 'Foodie', emoji: '🍕' },
  { id: 'dance', label: 'Dance', emoji: '💃' },
  { id: 'chill', label: 'Chill', emoji: '😌' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
];

interface VibeChipsProps {
  selectedVibes: string[];
  onToggle?: (vibeId: string) => void;
  editable?: boolean;
  maxDisplay?: number;
}

export const VibeChips: React.FC<VibeChipsProps> = ({
  selectedVibes,
  onToggle,
  editable = false,
  maxDisplay,
}) => {
  const vibesData = AVAILABLE_VIBES;
  const displayVibes = editable 
    ? vibesData 
    : vibesData.filter(v => selectedVibes.includes(v.id)).slice(0, maxDisplay);

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal={!editable} 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={editable ? styles.editableContent : styles.displayContent}
      >
        {editable ? (
          <View style={styles.editableGrid}>
            {vibesData.map((vibe) => {
              const isSelected = selectedVibes.includes(vibe.id);
              return (
                <TouchableOpacity
                  key={vibe.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => onToggle?.(vibe.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{vibe.emoji}</Text>
                  <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                    {vibe.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          displayVibes.map((vibe) => (
            <View key={vibe.id} style={[styles.chip, styles.chipSelected]}>
              <Text style={styles.chipEmoji}>{vibe.emoji}</Text>
              <Text style={[styles.chipLabel, styles.chipLabelSelected]}>{vibe.label}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export const getVibeById = (id: string): VibeChip | undefined => {
  return AVAILABLE_VIBES.find(v => v.id === id);
};

export { AVAILABLE_VIBES };

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  displayContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  editableContent: {
    paddingHorizontal: 4,
  },
  editableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  chipSelected: {
    backgroundColor: `${COLORS.gold.primary}15`,
    borderColor: COLORS.border.gold,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  chipLabelSelected: {
    color: COLORS.gold.primary,
  },
});

export default VibeChips;

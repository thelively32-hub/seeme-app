// SEE ME - Vibe System
// Los Vibes son el lenguaje único de la app para comunicar intenciones

export interface VibeType {
  id: string;
  icon: string;           // Emoji/Icon
  label: string;          // Nombre corto
  labelEs: string;        // Nombre en español
  defaultMessage: string; // Mensaje predeterminado
  defaultMessageEs: string;
  category: 'intention' | 'activity' | 'food' | 'expression';
  color: string;          // Color temático
}

// 18 Vibes oficiales de SEE ME
export const VIBES: VibeType[] = [
  // === INTENTIONS (Intenciones) ===
  {
    id: 'relationship',
    icon: '💕',
    label: 'Relationship',
    labelEs: 'Relación',
    defaultMessage: "Looking for something real 💕",
    defaultMessageEs: "Buscando algo real 💕",
    category: 'intention',
    color: '#E91E63',
  },
  {
    id: 'friendship',
    icon: '🤝',
    label: 'Friendship',
    labelEs: 'Amistad',
    defaultMessage: "Let's be friends! 🤝",
    defaultMessageEs: "¡Seamos amigos! 🤝",
    category: 'intention',
    color: '#4CAF50',
  },
  {
    id: 'casual',
    icon: '😎',
    label: 'Casual',
    labelEs: 'Casual',
    defaultMessage: "Just vibing, no pressure 😎",
    defaultMessageEs: "Sin presiones, solo vibras 😎",
    category: 'intention',
    color: '#FF9800',
  },

  // === ACTIVITIES (Actividades) ===
  {
    id: 'dance',
    icon: '💃',
    label: 'Dance',
    labelEs: 'Bailar',
    defaultMessage: "Wanna dance? 💃",
    defaultMessageEs: "¿Bailamos? 💃",
    category: 'activity',
    color: '#9C27B0',
  },
  {
    id: 'drinks',
    icon: '🍸',
    label: 'Drinks',
    labelEs: 'Un trago',
    defaultMessage: "Drinks on me? 🍸",
    defaultMessageEs: "¿Te invito un trago? 🍸",
    category: 'activity',
    color: '#F44336',
  },
  {
    id: 'movie',
    icon: '🎬',
    label: 'Movie',
    labelEs: 'Película',
    defaultMessage: "Movie night? 🎬",
    defaultMessageEs: "¿Noche de peli? 🎬",
    category: 'activity',
    color: '#673AB7',
  },
  {
    id: 'beach',
    icon: '🏖️',
    label: 'Beach',
    labelEs: 'Playa',
    defaultMessage: "Beach vibes? 🏖️",
    defaultMessageEs: "¿Playa? 🏖️",
    category: 'activity',
    color: '#00BCD4',
  },
  {
    id: 'theater',
    icon: '🎭',
    label: 'Theater',
    labelEs: 'Teatro',
    defaultMessage: "Theater tonight? 🎭",
    defaultMessageEs: "¿Teatro esta noche? 🎭",
    category: 'activity',
    color: '#795548',
  },
  {
    id: 'concert',
    icon: '🎵',
    label: 'Concert',
    labelEs: 'Concierto',
    defaultMessage: "Let's catch a show! 🎵",
    defaultMessageEs: "¡Vamos a un concierto! 🎵",
    category: 'activity',
    color: '#FF5722',
  },
  {
    id: 'gym',
    icon: '💪',
    label: 'Gym',
    labelEs: 'Gym',
    defaultMessage: "Workout buddy? 💪",
    defaultMessageEs: "¿Compañero de gym? 💪",
    category: 'activity',
    color: '#607D8B',
  },
  {
    id: 'park',
    icon: '🌳',
    label: 'Park',
    labelEs: 'Parque',
    defaultMessage: "Walk in the park? 🌳",
    defaultMessageEs: "¿Paseo por el parque? 🌳",
    category: 'activity',
    color: '#8BC34A',
  },

  // === FOOD (Comidas) ===
  {
    id: 'breakfast',
    icon: '🥐',
    label: 'Breakfast',
    labelEs: 'Desayuno',
    defaultMessage: "Breakfast together? 🥐",
    defaultMessageEs: "¿Desayunamos juntos? 🥐",
    category: 'food',
    color: '#FFC107',
  },
  {
    id: 'lunch',
    icon: '🍽️',
    label: 'Lunch',
    labelEs: 'Almuerzo',
    defaultMessage: "Lunch date? 🍽️",
    defaultMessageEs: "¿Almorzamos? 🍽️",
    category: 'food',
    color: '#FF9800',
  },
  {
    id: 'snack',
    icon: '☕',
    label: 'Snack',
    labelEs: 'Merienda',
    defaultMessage: "Coffee break? ☕",
    defaultMessageEs: "¿Un café? ☕",
    category: 'food',
    color: '#795548',
  },
  {
    id: 'dinner',
    icon: '🍷',
    label: 'Dinner',
    labelEs: 'Cena',
    defaultMessage: "Dinner tonight? 🍷",
    defaultMessageEs: "¿Cenamos esta noche? 🍷",
    category: 'food',
    color: '#9C27B0',
  },

  // === EXPRESSIONS (Expresiones) ===
  {
    id: 'letsgo',
    icon: '🚗',
    label: "Let's Go",
    labelEs: 'Vámonos',
    defaultMessage: "Let's get out of here! 🚗",
    defaultMessageEs: "¡Vámonos de aquí! 🚗",
    category: 'expression',
    color: '#2196F3',
  },
  {
    id: 'dontleave',
    icon: '🥺',
    label: "Don't Leave",
    labelEs: 'No te vayas',
    defaultMessage: "Don't go yet... 🥺",
    defaultMessageEs: "No te vayas aún... 🥺",
    category: 'expression',
    color: '#E91E63',
  },
  {
    id: 'stay',
    icon: '💫',
    label: 'Stay',
    labelEs: 'Quédate',
    defaultMessage: "Stay a little longer 💫",
    defaultMessageEs: "Quédate un poco más 💫",
    category: 'expression',
    color: '#FFD700',
  },
];

// Get vibe by ID
export const getVibeById = (id: string): VibeType | undefined => {
  return VIBES.find(v => v.id === id);
};

// Get vibes by category
export const getVibesByCategory = (category: VibeType['category']): VibeType[] => {
  return VIBES.filter(v => v.category === category);
};

// Categories with labels
export const VIBE_CATEGORIES = [
  { id: 'intention', label: 'Intentions', labelEs: 'Intenciones', icon: '💭' },
  { id: 'activity', label: 'Activities', labelEs: 'Actividades', icon: '🎯' },
  { id: 'food', label: 'Food & Drinks', labelEs: 'Comidas', icon: '🍽️' },
  { id: 'expression', label: 'Expressions', labelEs: 'Expresiones', icon: '💬' },
];

export default VIBES;

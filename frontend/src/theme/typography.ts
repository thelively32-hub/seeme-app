// VIBE ME - Typography System
// Escala tipográfica armónica basada en 8pt grid
// Senior Designer approved

export const TYPOGRAPHY = {
  // Font sizes - Escala modular (ratio 1.25)
  size: {
    xs: 10,      // Caption small
    sm: 12,      // Caption, labels
    base: 14,    // Body text
    md: 16,      // Body large, buttons
    lg: 18,      // Subtitles
    xl: 20,      // Section titles
    '2xl': 24,   // Screen titles
    '3xl': 28,   // Large headings
    '4xl': 32,   // Hero titles
    '5xl': 40,   // Logo size
  },

  // Font weights
  weight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },

  // Pre-defined text styles
  styles: {
    // Headers
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 30,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 26,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },

    // Body
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },

    // UI Elements
    button: {
      fontSize: 15,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
    },
    buttonSmall: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.2,
    },
    label: {
      fontSize: 12,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
    },
    caption: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 14,
    },

    // Special
    sectionHeader: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    badge: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
  },
};

export default TYPOGRAPHY;

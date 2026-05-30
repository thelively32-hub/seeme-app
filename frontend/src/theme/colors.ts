// VIBE ME Premium Color Theme
// Social Radar - Premium Discovery App
// Inspired by: Snapchat Maps, Apple, Bumble Premium, Raya

export const COLORS = {
  // Primary Gold Palette
  gold: {
    bright: '#FFE55C',
    primary: '#FFD700',
    medium: '#FFCC00',
    dark: '#E6B800',
    glow: 'rgba(255, 215, 0, 0.4)',
  },
  
  // Premium Accent - Purple
  premium: {
    primary: '#7B2EFF',
    light: '#9D4DFF',
    glow: 'rgba(123, 46, 255, 0.3)',
  },
  
  // Alternative Premium - Electric Blue
  electric: {
    primary: '#4CC9F0',
    glow: 'rgba(76, 201, 240, 0.3)',
  },
  
  // Energy Levels
  energy: {
    low: '#4CAF50',      // Green
    medium: '#FFD700',   // Yellow/Gold
    hot: '#FF9500',      // Orange
    trending: '#FF3B30', // Red
  },
  
  // Background - Ultra Dark
  background: {
    primary: '#050505',
    secondary: '#0D0D0D',
    tertiary: '#121212',
    card: 'rgba(255, 255, 255, 0.04)',
    cardHover: 'rgba(255, 255, 255, 0.08)',
  },
  
  // Glassmorphism
  glass: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.08)',
    blur: 20,
    radius: 24,
  },
  
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(255, 255, 255, 0.35)',
    dark: '#050505',
  },
  
  // Accent Colors
  accent: {
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#007AFF',
  },
  
  // Live Indicator
  live: {
    red: '#FF3B30',
    glow: 'rgba(255, 59, 48, 0.5)',
  },
  
  // Border
  border: {
    light: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    gold: 'rgba(255, 215, 0, 0.3)',
    premium: 'rgba(123, 46, 255, 0.3)',
  },
  
  // Gradients (as arrays for LinearGradient)
  gradients: {
    goldButton: ['#FFE55C', '#FFD700', '#FFCC00'],
    goldGlow: ['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0)'],
    premiumButton: ['#9D4DFF', '#7B2EFF'],
    premiumGlow: ['rgba(123, 46, 255, 0.3)', 'rgba(123, 46, 255, 0)'],
    darkBackground: ['#050505', '#0D0D0D', '#121212'],
    glassCard: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'],
    radarPulse: ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0)'],
  },
  
  // Legacy support
  cream: '#FFF8E7',
  champagne: '#F5E6C8',
  ivory: '#FFFEF5',
};

export default COLORS;

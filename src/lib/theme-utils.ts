// src/lib/theme-utils.ts
// Utility functions for applying light/dark theme styles

export type Theme = 'light' | 'dark';

export interface ThemeStyles {
  // Background colors
  background: string;
  cardBackground: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Border colors
  border: string;
  borderHover: string;
  
  // Button colors
  buttonPrimary: string;
  buttonSecondary: string;
  
  // Input colors
  inputBackground: string;
  inputBorder: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
}

export const getThemeStyles = (theme: Theme): ThemeStyles => {
  if (theme === 'dark') {
    return {
      // Dark theme styles
      background: 'bg-gray-900',
      cardBackground: 'bg-gray-800',
      
      textPrimary: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      
      border: 'border-gray-700',
      borderHover: 'border-gray-600',
      
      buttonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
      
      inputBackground: 'bg-gray-700',
      inputBorder: 'border-gray-600',
      
      success: 'text-green-400',
      error: 'text-red-400',
      warning: 'text-yellow-400',
    };
  }
  
  // Light theme styles (default)
  return {
    background: 'bg-gray-50',
    cardBackground: 'bg-white',
    
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    
    border: 'border-gray-200',
    borderHover: 'border-gray-300',
    
    buttonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    
    inputBackground: 'bg-white',
    inputBorder: 'border-gray-300',
    
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
  };
};

// Helper function to get inline styles for theme
export const getThemeInlineStyles = (theme: Theme) => {
  if (theme === 'dark') {
    return {
      backgroundColor: '#111827', // gray-900
      color: '#ffffff',
    };
  }
  
  return {
    backgroundColor: '#f9fafb', // gray-50
    color: '#111827', // gray-900
  };
};

// Helper function for form inputs
export const getInputStyles = (theme: Theme): string => {
  const styles = getThemeStyles(theme);
  return `${styles.inputBackground} ${styles.inputBorder} ${styles.textPrimary} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`;
};

// Helper function for cards
export const getCardStyles = (theme: Theme): string => {
  const styles = getThemeStyles(theme);
  return `${styles.cardBackground} ${styles.border} ${styles.textPrimary}`;
};
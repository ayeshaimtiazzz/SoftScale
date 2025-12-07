/**
 * Password strength utility
 * Checks password strength and provides feedback
 */

/**
 * Check password strength
 * @param {string} password - Password to check
 * @returns {Object} Strength information
 */
export const checkPasswordStrength = (password) => {
  if (!password) {
    return {
      strength: 'none',
      score: 0,
      feedback: [],
      isValid: false,
    };
  }

  const feedback = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    feedback.push('At least 8 characters');
  } else {
    score += 1;
    if (password.length >= 12) {
      score += 1;
    }
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('One lowercase letter');
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('One uppercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    feedback.push('One number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    feedback.push("One special character");
  } else {
    score += 1;
  }

  // Determine strength level
  let strength = 'weak';
  let isValid = false;

  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
    isValid = password.length >= 8; // Must be at least 8 chars to be valid
  }

  // Password is valid if it meets minimum requirements
  isValid = password.length >= 8 && score >= 3;

  return {
    strength,
    score,
    feedback,
    isValid,
  };
};

/**
 * Get password strength color
 * @param {string} strength - Strength level (weak, medium, strong)
 * @returns {string} Color code
 */
export const getPasswordStrengthColor = (strength) => {
  switch (strength) {
    case 'weak':
      return '#f44336'; // Red
    case 'medium':
      return '#ff9800'; // Orange
    case 'strong':
      return '#4caf50'; // Green
    default:
      return '#9e9e9e'; // Grey
  }
};

/**
 * Get password strength label
 * @param {string} strength - Strength level
 * @returns {string} Label text
 */
export const getPasswordStrengthLabel = (strength) => {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
};

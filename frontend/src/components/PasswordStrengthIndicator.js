/**
 * Password Strength Indicator Component
 * Shows visual feedback for password strength
 */

import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { checkPasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from '../utils/passwordStrength';

const PasswordStrengthIndicator = ({ password }) => {
  if (!password) {
    return null;
  }

  const { strength, score, feedback } = checkPasswordStrength(password);
  const color = getPasswordStrengthColor(strength);
  const label = getPasswordStrengthLabel(strength);

  // Calculate progress percentage (0-100)
  const progress = (score / 6) * 100;

  return (
    <Box sx={{ mt: 1, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 600 }}>
          Password Strength: {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {score}/6
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 3,
          },
        }}
      />
      {feedback.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Requirements missing:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
            {feedback.map((item, index) => (
              <Typography
                key={index}
                component="li"
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem' }}
              >
                {item}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PasswordStrengthIndicator;

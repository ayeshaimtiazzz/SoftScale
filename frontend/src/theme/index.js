/**
 * Material UI theme configuration
 * All colors, spacing, and typography should use theme values
 */

import { createTheme } from "@mui/material/styles";
import { COLORS } from "../constants/colors";

/**
 * Get theme based on mode (light/dark)
 * @param {string} mode - Theme mode: 'light' or 'dark'
 * @returns {Object} Material UI theme object
 */
export const getTheme = (mode = "light") => {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      primary: {
        main: COLORS.primary.main,
        light: COLORS.primary.light,
        dark: COLORS.primary.dark,
        contrastText: COLORS.neutral.white,
      },
      secondary: {
        main: COLORS.secondary.main,
        light: COLORS.secondary.light,
        dark: COLORS.secondary.dark,
        contrastText: COLORS.neutral.white,
      },
      error: {
        main: COLORS.secondary.main,
        light: COLORS.secondary.light,
        dark: COLORS.secondary.dark,
      },
      warning: {
        main: COLORS.accent.main,
        light: COLORS.accent.light,
        dark: COLORS.accent.dark,
      },
      info: {
        main: COLORS.info.main,
        light: COLORS.info.light,
        dark: COLORS.info.dark,
        contrastText: COLORS.neutral.white,
      },
      success: {
        main: COLORS.success.main,
        light: COLORS.success.light,
        dark: COLORS.success.dark,
      },
      mode: mode,
      background: {
        default: isDark ? COLORS.neutral.gray900 : COLORS.neutral.gray50,
        paper: isDark ? COLORS.neutral.gray800 : COLORS.neutral.white,
      },
      text: {
        primary: isDark ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
        secondary: isDark ? COLORS.neutral.gray400 : COLORS.neutral.gray600,
      },
    },
    typography: {
      fontFamily: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"].join(","),
      h1: {
        fontSize: "2.5rem",
        fontWeight: 600,
        lineHeight: 1.2,
        color: isDark ? COLORS.neutral.gray50 : COLORS.neutral.gray900,
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 600,
        lineHeight: 1.3,
        color: isDark ? COLORS.neutral.gray50 : COLORS.neutral.gray900,
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 600,
        lineHeight: 1.4,
        color: isDark ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 600,
        lineHeight: 1.4,
        color: isDark ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.5,
        color: isDark ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.5,
        color: isDark ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.5,
        color: isDark ? COLORS.neutral.gray200 : COLORS.neutral.gray900,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
        color: isDark ? COLORS.neutral.gray300 : COLORS.neutral.gray600,
      },
    },
    spacing: 8,
    shape: {
      borderRadius: 12,
    },
    shadows: [
      "none",
      "0 2px 4px rgba(0,0,0,0.05)",
      "0 4px 8px rgba(0,0,0,0.08)",
      "0 6px 12px rgba(0,0,0,0.1)",
      "0 8px 16px rgba(0,0,0,0.12)",
      "0 12px 24px rgba(0,0,0,0.15)",
      "0 16px 32px rgba(0,0,0,0.18)",
      "0 20px 40px rgba(0,0,0,0.2)",
      "0 24px 48px rgba(0,0,0,0.22)",
      "0 28px 56px rgba(0,0,0,0.24)",
      "0 32px 64px rgba(0,0,0,0.26)",
      "0 36px 72px rgba(0,0,0,0.28)",
      "0 40px 80px rgba(0,0,0,0.3)",
      "0 44px 88px rgba(0,0,0,0.32)",
      "0 48px 96px rgba(0,0,0,0.34)",
      "0 52px 104px rgba(0,0,0,0.36)",
      "0 56px 112px rgba(0,0,0,0.38)",
      "0 60px 120px rgba(0,0,0,0.4)",
      "0 64px 128px rgba(0,0,0,0.42)",
      "0 68px 136px rgba(0,0,0,0.44)",
      "0 72px 144px rgba(0,0,0,0.46)",
      "0 76px 152px rgba(0,0,0,0.48)",
      "0 80px 160px rgba(0,0,0,0.5)",
      "0 84px 168px rgba(0,0,0,0.52)",
      "0 88px 176px rgba(0,0,0,0.54)",
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 12,
            padding: "12px 28px",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${COLORS.primary.gradientStart} 0%, ${COLORS.primary.gradientMid} 50%, ${COLORS.primary.gradientEnd} 100%)`,
            boxShadow: `0 6px 16px ${COLORS.primary.darker}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
              boxShadow: `0 8px 24px ${COLORS.primary.darker}60`,
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
            boxShadow: `0 6px 16px ${COLORS.secondary.darker}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
              boxShadow: `0 8px 24px ${COLORS.secondary.darker}60`,
            },
          },
          containedError: {
            background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
            boxShadow: `0 6px 16px ${COLORS.secondary.darker}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
              boxShadow: `0 8px 24px ${COLORS.secondary.darker}60`,
            },
          },
          containedWarning: {
            background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
            boxShadow: `0 6px 16px ${COLORS.accent.darker}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
              boxShadow: `0 8px 24px ${COLORS.accent.darker}60`,
            },
          },
          containedInfo: {
            background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
            boxShadow: `0 6px 16px ${COLORS.info.darker}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
              boxShadow: `0 8px 24px ${COLORS.info.darker}60`,
            },
          },
          containedSuccess: {
            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
            boxShadow: `0 6px 16px ${COLORS.success.darker}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
              boxShadow: `0 8px 24px ${COLORS.success.darker}60`,
            },
          },
          outlinedPrimary: {
            borderColor: COLORS.primary.main,
            borderWidth: 2,
            "&:hover": {
              borderColor: COLORS.primary.dark,
              backgroundColor: `${COLORS.primary.main}10`,
              borderWidth: 2,
            },
          },
          outlinedSecondary: {
            borderColor: COLORS.secondary.main,
            borderWidth: 2,
            "&:hover": {
              borderColor: COLORS.secondary.dark,
              backgroundColor: `${COLORS.secondary.main}10`,
              borderWidth: 2,
            },
          },
          outlinedError: {
            borderColor: COLORS.secondary.main,
            borderWidth: 2,
            "&:hover": {
              borderColor: COLORS.secondary.dark,
              backgroundColor: `${COLORS.secondary.main}10`,
              borderWidth: 2,
            },
          },
          outlinedWarning: {
            borderColor: COLORS.accent.main,
            borderWidth: 2,
            "&:hover": {
              borderColor: COLORS.accent.dark,
              backgroundColor: `${COLORS.accent.main}10`,
              borderWidth: 2,
            },
          },
          outlinedInfo: {
            borderColor: COLORS.info.main,
            borderWidth: 2,
            "&:hover": {
              borderColor: COLORS.info.dark,
              backgroundColor: `${COLORS.info.main}10`,
              borderWidth: 2,
            },
          },
          outlinedSuccess: {
            borderColor: COLORS.success.main,
            borderWidth: 2,
            "&:hover": {
              borderColor: COLORS.success.dark,
              backgroundColor: `${COLORS.success.main}10`,
              borderWidth: 2,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                boxShadow: `0 4px 12px ${COLORS.info.light}20`,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
                borderWidth: 2,
              },
              "&.Mui-focused": {
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                boxShadow: `0 6px 16px ${COLORS.info.main}30`,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            "&:hover": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(10px)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
              },
            },
            "&.Mui-focused": {
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
              },
            },
          },
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: COLORS.info.main,
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            background:
              theme.palette.mode === "dark"
                ? `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`
                : `linear-gradient(135deg, ${COLORS.primary.gradientStart} 0%, ${COLORS.primary.gradientMid} 50%, ${COLORS.primary.gradientEnd} 100%)`,
            boxShadow: theme.palette.mode === "dark" ? `0 2px 8px ${COLORS.primary.darkest}80` : `0 2px 8px ${COLORS.primary.darker}50`,
            borderRadius: 0,
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            background: theme.palette.background.paper,
            boxShadow: theme.palette.mode === "dark" ? `0 2px 8px ${COLORS.neutral.gray900}80` : "0 2px 8px rgba(0, 0, 0, 0.1)",
            border: theme.palette.mode === "dark" ? `1px solid ${COLORS.neutral.gray700}` : `1px solid ${COLORS.neutral.gray200}`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: theme.palette.mode === "dark" ? `0 4px 16px ${COLORS.primary.darker}60` : `0 4px 16px ${COLORS.primary.lighter}30`,
              borderColor: theme.palette.mode === "dark" ? COLORS.primary.light : COLORS.primary.light,
            },
          }),
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            "&:last-child": {
              paddingBottom: 16,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: 16,
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          },
          elevation1: {
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          },
          elevation2: {
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
          },
          elevation3: {
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
            "& .MuiTableCell-head": {
              color: COLORS.neutral.white,
              fontWeight: 600,
              borderBottom: "none",
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${COLORS.neutral.gray200}`,
            padding: "16px",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "all 0.2s ease",
            "&:nth-of-type(even)": {
              backgroundColor: `${COLORS.info.lightest}10`,
            },
            "&:hover": {
              backgroundColor: `${COLORS.info.light}20`,
              transform: "scale(1.01)",
              boxShadow: `0 4px 12px ${COLORS.info.main}15`,
            },
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            marginBottom: 8,
            "&:before": {
              display: "none",
            },
            "&:hover": {
              boxShadow: `0 6px 20px ${COLORS.accent.main}25`,
              borderColor: `${COLORS.accent.main}40`,
            },
            "&.Mui-expanded": {
              margin: "8px 0",
              boxShadow: `0 8px 24px ${COLORS.success.main}25`,
              borderColor: `${COLORS.success.main}40`,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: "16px 20px",
            "&:hover": {
              backgroundColor: `${COLORS.accent.lightest}20`,
            },
            "&.Mui-expanded": {
              backgroundColor: `${COLORS.success.lightest}20`,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: "20px",
            backgroundColor: `${COLORS.success.lightest}10`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          },
          colorPrimary: {
            background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.primary.darker}40`,
            },
          },
          colorSecondary: {
            background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.secondary.darker}40`,
            },
          },
          colorError: {
            background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.secondary.darker}40`,
            },
          },
          colorWarning: {
            background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.accent.darker}40`,
            },
          },
          colorInfo: {
            background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.info.darker}40`,
            },
          },
          colorSuccess: {
            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
              boxShadow: `0 4px 12px ${COLORS.success.darker}40`,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            margin: "4px 8px",
            transition: "all 0.2s ease",
            "&.Mui-selected": {
              backgroundColor: `${COLORS.info.main}20`,
              color: COLORS.info.dark,
              borderLeft: `4px solid ${COLORS.info.main}`,
              "&:hover": {
                backgroundColor: `${COLORS.info.main}30`,
              },
            },
            "&:hover": {
              backgroundColor: `${COLORS.accent.lightest}20`,
              transform: "translateX(4px)",
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: `${COLORS.info.main}15`,
              transform: "scale(1.1)",
              boxShadow: `0 4px 12px ${COLORS.info.main}25`,
            },
          },
          colorPrimary: {
            "&:hover": {
              backgroundColor: `${COLORS.primary.main}15`,
              boxShadow: `0 4px 12px ${COLORS.primary.main}25`,
            },
          },
          colorSecondary: {
            "&:hover": {
              backgroundColor: `${COLORS.secondary.main}15`,
              boxShadow: `0 4px 12px ${COLORS.secondary.main}25`,
            },
          },
          colorError: {
            "&:hover": {
              backgroundColor: `${COLORS.secondary.main}15`,
              boxShadow: `0 4px 12px ${COLORS.secondary.main}25`,
            },
          },
          colorWarning: {
            "&:hover": {
              backgroundColor: `${COLORS.accent.main}15`,
              boxShadow: `0 4px 12px ${COLORS.accent.main}25`,
            },
          },
          colorInfo: {
            "&:hover": {
              backgroundColor: `${COLORS.info.main}15`,
              boxShadow: `0 4px 12px ${COLORS.info.main}25`,
            },
          },
          colorSuccess: {
            "&:hover": {
              backgroundColor: `${COLORS.success.main}15`,
              boxShadow: `0 4px 12px ${COLORS.success.main}25`,
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: "scale(1.1) translateY(-2px)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
            },
          },
          colorPrimary: {
            background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
            },
          },
          colorSecondary: {
            background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
            },
          },
          colorError: {
            background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
            },
          },
          colorWarning: {
            background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
            },
          },
          colorInfo: {
            background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
            },
          },
          colorSuccess: {
            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
          },
          standardError: {
            background: `linear-gradient(135deg, ${COLORS.secondary.lightest} 0%, ${COLORS.secondary.lighter} 100%)`,
            border: `1px solid ${COLORS.secondary.main}`,
          },
          standardWarning: {
            background: `linear-gradient(135deg, ${COLORS.accent.lightest} 0%, ${COLORS.accent.lighter} 100%)`,
            border: `1px solid ${COLORS.accent.main}`,
          },
          standardInfo: {
            background: `linear-gradient(135deg, ${COLORS.info.lightest} 0%, ${COLORS.info.lighter} 100%)`,
            border: `1px solid ${COLORS.info.main}`,
          },
          standardSuccess: {
            background: `linear-gradient(135deg, ${COLORS.success.lightest} 0%, ${COLORS.success.lighter} 100%)`,
            border: `1px solid ${COLORS.success.main}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(30px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 0,
            background: theme.palette.mode === "dark" ? theme.palette.background.paper : COLORS.neutral.gray100,
            borderRight: theme.palette.mode === "dark" ? `1px solid ${COLORS.neutral.gray700}` : `1px solid ${COLORS.neutral.gray300}`,
          }),
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 8,
            background: theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.background.paper,
            boxShadow: theme.palette.mode === "dark" ? `0 4px 16px ${COLORS.neutral.gray900}80` : `0 4px 16px ${COLORS.neutral.gray300}40`,
            border: theme.palette.mode === "dark" ? `1px solid ${COLORS.neutral.gray700}` : `1px solid ${COLORS.neutral.gray200}`,
          }),
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "4px 8px",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: `${COLORS.info.light}20`,
              transform: "translateX(4px)",
            },
            "&.Mui-selected": {
              backgroundColor: `${COLORS.info.main}20`,
              "&:hover": {
                backgroundColor: `${COLORS.info.main}30`,
              },
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              minHeight: 48,
              "&:hover": {
                color: COLORS.info.main,
              },
              "&.Mui-selected": {
                color: COLORS.info.main,
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: COLORS.info.main,
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            "&:hover": {
              backgroundColor: `${COLORS.accent.lightest}20`,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": {
              color: COLORS.success.main,
              "& + .MuiSwitch-track": {
                backgroundColor: COLORS.success.main,
              },
            },
          },
          track: {
            backgroundColor: COLORS.neutral.gray400,
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            "&.Mui-checked": {
              color: COLORS.success.main,
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            "&.Mui-checked": {
              color: COLORS.info.main,
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            "& .MuiSlider-thumb": {
              boxShadow: `0 4px 12px ${COLORS.info.main}40`,
              "&:hover": {
                boxShadow: `0 6px 16px ${COLORS.info.main}60`,
              },
            },
            "& .MuiSlider-track": {
              backgroundColor: COLORS.info.main,
            },
          },
          colorPrimary: {
            "& .MuiSlider-thumb": {
              boxShadow: `0 4px 12px ${COLORS.primary.main}40`,
            },
            "& .MuiSlider-track": {
              backgroundColor: COLORS.primary.main,
            },
          },
          colorSecondary: {
            "& .MuiSlider-thumb": {
              boxShadow: `0 4px 12px ${COLORS.secondary.main}40`,
            },
            "& .MuiSlider-track": {
              backgroundColor: COLORS.secondary.main,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 8,
            backgroundColor: COLORS.neutral.gray200,
          },
          bar: {
            borderRadius: 4,
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            "&.MuiCircularProgress-colorPrimary": {
              color: COLORS.primary.main,
            },
            "&.MuiCircularProgress-colorSecondary": {
              color: COLORS.secondary.main,
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? theme.palette.text.primary : "inherit",
          }),
          h1: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? COLORS.neutral.gray50 : COLORS.neutral.gray900,
          }),
          h2: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? COLORS.neutral.gray50 : COLORS.neutral.gray900,
          }),
          h3: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
          }),
          h4: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
          }),
          h5: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
          }),
          h6: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? COLORS.neutral.gray100 : COLORS.neutral.gray900,
          }),
        },
      },
    },
  });
};

// Export default light theme for backward compatibility
export const theme = getTheme("light");


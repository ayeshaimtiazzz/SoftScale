import React from "react";
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Chip,
  Stack,
  Grid,
} from "@mui/material";
import {
  TrendingUp,
  Star,
  Person,
} from "@mui/icons-material";
import { SAMPLE_CANDIDATES } from "../../constants";
import { COLORS } from "../../constants";

const candidates = SAMPLE_CANDIDATES;

const getInitials = (name) => {
  const parts = name.split(" ");
  return parts[0][0] + (parts[1] ? parts[1][0] : "");
};

const getAvatarColor = (name) => {
  const colors = [
    COLORS.primary.main,
    COLORS.info.main,
    COLORS.success.main,
    COLORS.accent.main,
    COLORS.secondary.main,
  ];
  const index = (name?.charCodeAt(0) || 0) % colors.length;
  return colors[index];
};

const getMatchColor = (match) => {
  if (match >= 90) return COLORS.success.main;
  if (match >= 75) return COLORS.info.main;
  if (match >= 60) return COLORS.accent.main;
  return COLORS.secondary.main;
};

const TopCandidates = () => {
  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: COLORS.primary.dark,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <TrendingUp sx={{ color: COLORS.primary.main }} />
        Top Candidates
      </Typography>
      <Grid container spacing={2}>
        {candidates.map((candidate, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: "100%",
                borderLeft: `4px solid ${getAvatarColor(candidate.name)}`,
                boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-8px) scale(1.02)",
                  boxShadow: `0 8px 24px ${getAvatarColor(candidate.name)}40`,
                  borderLeft: `4px solid ${getAvatarColor(candidate.name)}`,
                },
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${getAvatarColor(candidate.name)}, ${COLORS.primary.light})`,
                  opacity: 0,
                  transition: "opacity 0.3s",
                },
                "&:hover::before": {
                  opacity: 1,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  {candidate.profilePic ? (
                    <Avatar
                      src={candidate.profilePic}
                      alt={candidate.name}
                      sx={{
                        width: 56,
                        height: 56,
                        mr: 2,
                        boxShadow: `0 4px 12px ${getAvatarColor(candidate.name)}50`,
                      }}
                    />
                  ) : (
                    <Avatar
                      sx={{
                        bgcolor: getAvatarColor(candidate.name),
                        width: 56,
                        height: 56,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        mr: 2,
                        boxShadow: `0 4px 12px ${getAvatarColor(candidate.name)}50`,
                      }}
                    >
                      {getInitials(candidate.name)}
                    </Avatar>
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: COLORS.primary.dark,
                        mb: 0.5,
                      }}
                    >
                      {candidate.name}
                    </Typography>
                    {candidate.skills && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.875rem" }}
                      >
                        {candidate.skills}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 2,
                    pt: 2,
                    borderTop: `1px solid ${COLORS.neutral.gray200}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Star
                      sx={{
                        fontSize: 20,
                        color: getMatchColor(candidate.match),
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: getMatchColor(candidate.match),
                      }}
                    >
                      {candidate.match}% Match
                    </Typography>
                  </Box>
                  <Chip
                    icon={<Person sx={{ fontSize: 16 }} />}
                    label="View"
                    size="small"
                    sx={{
                      bgcolor: `${getMatchColor(candidate.match)}20`,
                      color: getMatchColor(candidate.match),
                      fontWeight: 600,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: `${getMatchColor(candidate.match)}30`,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TopCandidates;



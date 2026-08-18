import React from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import TalentMatch from "../talent-match";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Lead Discovery page - uses the talent-match functionality
 * This redirects to the talent-match component which handles lead discovery
 * through the backend /talent-match endpoint
 */
function LeadDiscovery() {
  const { user } = useAuth();
  const normalizedRole = user?.role === "jobseeker" ? "job_seeker" : user?.role;
  const isJobSeeker = normalizedRole === "job_seeker";
  const isFreelancer = normalizedRole === "freelancer";

  return (
    <Stack spacing={2}>
      {(isJobSeeker || isFreelancer) && (
        <Alert severity="info" sx={{ mt: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {isJobSeeker ? "Job Seeker Lead Discovery View" : "Freelancer Lead Discovery View"}
            </Typography>
            <Typography variant="body2">
              {isJobSeeker
                ? "Focus on high-fit jobs, fast apply actions, and application tracking."
                : "Focus on project/client opportunities, deal creation, and budget insights."}
            </Typography>
          </Box>
        </Alert>
      )}
      <TalentMatch />
    </Stack>
  );
}

export default LeadDiscovery;


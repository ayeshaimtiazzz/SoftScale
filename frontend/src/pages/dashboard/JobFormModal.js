import React from "react";
import { Dialog, DialogTitle, DialogContent, TextField, MenuItem, Button, Stack } from "@mui/material";
import { DOMAINS, JobType, WorkMode } from "../../constants";
import { COLORS } from "../../constants";

const jobTypes = Object.values(JobType);
const workModes = Object.values(WorkMode);

const JobFormModal = ({ open, onClose, jobForm, handleJobChange, handleJobSubmit, loading, t }) => {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t("forms.createJob")}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleJobSubmit} sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label={t("forms.jobTitle")}
              value={jobForm.job_title}
              onChange={(e) => handleJobChange("job_title", e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={t("forms.jobDescription")}
              value={jobForm.job_description}
              onChange={(e) => handleJobChange("job_description", e.target.value)}
              required
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              select
              label={t("forms.jobType")}
              value={jobForm.job_type}
              onChange={(e) => handleJobChange("job_type", e.target.value)}
              required
              fullWidth
            >
              {jobTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("forms.requiredExperience")}
              value={jobForm.required_experience}
              onChange={(e) => handleJobChange("required_experience", e.target.value)}
              fullWidth
            />
            <TextField
              label={t("forms.skillsPlaceholder")}
              value={jobForm.required_skills}
              onChange={(e) => handleJobChange("required_skills", e.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t("forms.workMode")}
              value={jobForm.work_mode}
              onChange={(e) => handleJobChange("work_mode", e.target.value)}
              required
              fullWidth
            >
              {workModes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label={t("forms.salary")}
              value={jobForm.salary}
              onChange={(e) => handleJobChange("salary", e.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t("forms.preferredDomain")}
              value={jobForm.preferred_domain}
              onChange={(e) => handleJobChange("preferred_domain", e.target.value)}
              required
              fullWidth
            >
              {DOMAINS.map((domain) => (
                <MenuItem key={domain} value={domain}>
                  {domain}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button onClick={onClose} variant="outlined">
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                  "&:hover": {
                    background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
                  },
                }}
              >
                {loading ? t("forms.posting") : t("forms.createJob")}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default JobFormModal;


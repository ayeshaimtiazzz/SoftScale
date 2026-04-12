import React, { useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useTranslation } from "react-i18next";
import Profile from "../profile";
import CompanyProfileEditDialog from "../../components/company/CompanyProfileEditDialog";

/**
 * Company profile inside My workspace, with edit (signup-equivalent fields).
 */
const WorkspaceProfilePage = () => {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [profileKey, setProfileKey] = useState(0);

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => setEditOpen(true)}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {t("companyWorkspace.editProfile")}
        </Button>
      </Box>
      <Profile key={profileKey} />
      <CompanyProfileEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => setProfileKey((k) => k + 1)}
      />
    </Stack>
  );
};

export default WorkspaceProfilePage;

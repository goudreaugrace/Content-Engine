import { Box, MenuItem, TextField, Typography, type SxProps, type Theme } from "@mui/material";
import { DEMO_USERS, useDemoUser } from "../lib/demo-users";
import { setViewingContentOwner } from "../lib/content-owner-view";
import { usePersonaMode } from "../lib/persona";

export default function StoryUserSelect({ sx }: { sx?: SxProps<Theme> }) {
  const [user, setUser] = useDemoUser();
  const [, setPersonaMode] = usePersonaMode();

  return (
    <TextField
      select
      size="small"
      label="POC: View as Super Admin"
      value={user.id}
      onChange={(event) => {
        const next = DEMO_USERS.find((candidate) => candidate.id === event.target.value) ?? DEMO_USERS[0];
        setUser(next.id);
        if (next.contentOwnerKey) setViewingContentOwner(next.contentOwnerKey);
        setPersonaMode("super-admin");
      }}
      sx={{ minWidth: 260, ...sx }}
      SelectProps={{ MenuProps: { PaperProps: { sx: { mt: 0.5 } } } }}
    >
      {DEMO_USERS.map((candidate) => (
        <MenuItem key={candidate.id} value={candidate.id}>
          <Box>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{candidate.name}</Typography>
            <Typography variant="caption">
              {candidate.teamAdmin ? "Super Admin + Team Admin" : "Super Admin + Content Owner"}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </TextField>
  );
}

import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  Avatar,
  MenuItem,
  TextField,
  useTheme,
  alpha,
} from "@mui/material";
import { useActivity } from "../lib/use-activity";
import { usePersonaMode, type PersonaMode } from "../lib/persona";
import MenuIcon from "@mui/icons-material/Menu";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

// M3 navigation drawer / rail widths.
//  - Expanded (272): drawer with icons + labels + section headers.
//  - Collapsed (72): rail with icons only; labels/sections appear in tooltips.
// M3's spec calls for 80 on the rail; 72 reads a touch denser and keeps the
// rest of the app's compact aesthetic.
const DRAWER_WIDTH_EXPANDED = 272;
const DRAWER_WIDTH_COLLAPSED = 72;
const NAV_COLLAPSED_KEY = "app-nav-collapsed-v1";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  section?: string;
  exact?: boolean;
  /**
   * Optional notification count to render as an ember pill next to the
   * label (expanded) or as a small dot on the icon (collapsed). Today only
   * Review Cycle uses this — the count comes from the activity feed via
   * useActivity().
   */
  badgeCount?: number;
  adminOnly?: boolean;
};

// "New article" is the writer's primary action — surfaced as the top nav item
// AND as a contextual page-header button on the Articles tab. Multiple entry
// points, one action. (We tried a FAB-only model earlier; it hurt
// discoverability for part-time writers who needed to find the action cold.)
const navItems: NavItem[] = [
  { label: "New Article", path: "/new", icon: <AddCircleOutlineIcon sx={{ fontSize: 20 }} /> },
  // Review Cycle used to be its own top-level page. It now lives as the
  // default "Needs review" tab on the All Articles page, so the sidebar
  // carries a single entry that lands on the merged surface.
  { label: "All Articles", path: "/", icon: <LibraryBooksOutlinedIcon sx={{ fontSize: 20 }} />, exact: true },
  { label: "Sectors", path: "/admin/sectors", icon: <PublicOutlinedIcon sx={{ fontSize: 20 }} />, section: "Admin", adminOnly: true },
  { label: "Audiences", path: "/admin/audiences", icon: <PeopleOutlinedIcon sx={{ fontSize: 20 }} />, section: "Admin", adminOnly: true },
  { label: "Email Log", path: "/admin/emails", icon: <EmailOutlinedIcon sx={{ fontSize: 20 }} />, section: "Admin", adminOnly: true },
  { label: "How It Works", path: "/how-it-works", icon: <AccountTreeOutlinedIcon sx={{ fontSize: 20 }} />, section: "Reference" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [personaMode, setPersonaMode] = usePersonaMode();

  useEffect(() => {
    if (personaMode === "non-admin" && location.pathname.startsWith("/admin")) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate, personaMode]);

  // Drives the unread badge on the All Articles nav item — inherited
  // from the old Review Cycle entry after the two pages were merged.
  const { unreadCount } = useActivity();
  // Build the nav list with the badge count injected. Keeps the base
  // navItems definition declarative + cheap to scan.
  const visibleNavItems = navItems.filter(
    (it) => personaMode === "admin" || !it.adminOnly,
  );
  const navItemsWithBadges: NavItem[] = visibleNavItems.map((it) =>
    it.path === "/" ? { ...it, badgeCount: unreadCount } : it,
  );

  /**
   * Desktop nav collapsed state. Persisted to localStorage so a user's
   * preference sticks across reloads. Mobile uses the temporary Drawer
   * (always expanded when open) and ignores this.
   */
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(NAV_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [collapsed]);

  const drawerWidth = collapsed
    ? DRAWER_WIDTH_COLLAPSED
    : DRAWER_WIDTH_EXPANDED;

  // Expose the live drawer width as a CSS variable on :root so other
  // fixed-position elements (notably the EditDock on article-detail) can
  // bind their left edge to it without React context plumbing. Set to
  // 0 on mobile since the permanent drawer doesn't render there.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 600px)").matches;
    document.documentElement.style.setProperty(
      "--drawer-width",
      isDesktop ? `${drawerWidth}px` : "0px",
    );
  }, [drawerWidth]);

  // `compact` controls whether labels/section headers render. The mobile
  // drawer always uses the expanded layout; only the permanent desktop
  // drawer collapses. So `drawerContent(false)` is for mobile + expanded
  // desktop, `drawerContent(true)` is for collapsed desktop.
  const drawerContent = (compact: boolean) => (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: t.paper }}>
      {/* Brand block. Expanded: wordmark + caption on the left, collapse
          chevron on the right of the same row. Collapsed: just the chevron
          centered (the page chrome carries enough product identity that the
          rail doesn't also need a mark). */}
      <Box
        sx={{
          px: compact ? 0 : 2.5,
          pt: 3,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: compact ? "center" : "space-between",
          gap: 1,
          minHeight: 56,
        }}
      >
        {!compact && (
          <Box>
            <Typography
              sx={{
                fontFamily: theme.palette.fonts.serif,
                fontSize: "1.0625rem",
                fontWeight: 400,
                color: t.ink,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              MyPepsiCo
            </Typography>
            <Typography
              sx={{
                fontFamily: theme.palette.fonts.mono,
                fontSize: "0.6875rem",
                color: t.slate,
                mt: 0.25,
                letterSpacing: "0.02em",
              }}
            >
              content-agent
            </Typography>
          </Box>
        )}
        {/* Collapse toggle. Lives inline with the brand wordmark when
            expanded; sits alone (centered) when the rail is collapsed.
            Desktop-only — mobile drawer always opens full-width. */}
        {!mobileOpen && (
          <Tooltip
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            placement="right"
          >
            <IconButton
              size="small"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
              sx={{
                color: t.slate,
                mt: compact ? 0 : -0.5,
                "&:hover": { color: t.ink, bgcolor: alpha(t.ink, 0.04) },
              }}
            >
              {compact ? (
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              ) : (
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <PersonaSwitcher
        compact={compact}
        mode={personaMode}
        onChange={setPersonaMode}
      />

      <List sx={{ flex: 1, px: compact ? 0.5 : 1, py: 0 }}>
        {navItemsWithBadges.map((item, idx) => {
          const showSection =
            item.section && (idx === 0 || navItemsWithBadges[idx - 1].section !== item.section);
          const selected = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          // M3 rail pattern: in compact mode, section headers collapse to a
          // thin divider so the grouping is still legible without text.
          const sectionMarker = showSection ? (
            compact ? (
              <Divider sx={{ mx: 1, my: 1, borderColor: t.border }} />
            ) : (
              <Box sx={{ px: 1.5, pt: 2.5, pb: 0.75 }}>
                <Typography variant="overline">{item.section}</Typography>
              </Box>
            )
          ) : null;

          // M3 nav destination. Expanded: 48-high pill with icon + label.
          // Collapsed: 48-square icon-only pill, centered, wrapped in a
          // tooltip so the label is still discoverable on hover.
          const button = (
            <ListItemButton
              disableRipple
              selected={selected}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: compact ? 2.5 : 999,
                px: compact ? 0 : 2,
                py: 0,
                mb: 0.5,
                minHeight: 48,
                width: compact ? 48 : "auto",
                mx: compact ? "auto" : 0,
                justifyContent: compact ? "center" : "flex-start",
                color: t.slate,
                "&:hover": { backgroundColor: alpha(t.ink, 0.04) },
                "&.Mui-selected": {
                  backgroundColor: t.pepsiBlueSubtle,
                  color: t.pepsiBlueStrong,
                  "&:hover": { backgroundColor: alpha(t.pepsiBlue, 0.16) },
                  "& .MuiListItemIcon-root": { color: t.pepsiBlueStrong },
                  "& .MuiListItemText-primary": { fontWeight: 600 },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: compact ? 0 : 36,
                  color: "inherit",
                  justifyContent: "center",
                }}
              >
                {/* In compact mode the badge becomes a small dot overlay on
                    the icon — same ember accent the system uses everywhere
                    else for "attention" signals. In expanded mode the badge
                    renders as a pill inside the right end of the row
                    (below). */}
                {compact && item.badgeCount && item.badgeCount > 0 ? (
                  <Badge
                    variant="dot"
                    overlap="circular"
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    sx={{
                      "& .MuiBadge-dot": {
                        bgcolor: t.ember,
                        boxShadow: `0 0 0 2px ${t.paper}`,
                      },
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              {!compact && (
                <>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      letterSpacing: "0.005em",
                    }}
                  />
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        px: 0.75,
                        borderRadius: 999,
                        bgcolor: t.ember,
                        color: "#FFFFFF",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {item.badgeCount > 99 ? "99+" : item.badgeCount}
                    </Box>
                  ) : null}
                </>
              )}
            </ListItemButton>
          );

          return (
            <Box key={item.path}>
              {sectionMarker}
              {compact ? (
                <Tooltip
                  title={item.label}
                  placement="right"
                  enterDelay={300}
                >
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </Box>
          );
        })}
      </List>

      {/* User row. Expanded: avatar + name + role. Collapsed: avatar only,
          centered, with the name in a hover tooltip. */}
      <Box
        sx={{
          px: compact ? 0 : 1.5,
          py: 1.5,
          borderTop: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          gap: 1.25,
        }}
      >
        {compact ? (
          <Tooltip title={personaMode === "admin" ? "Admin · governance" : "Non Admin · writer-manager"} placement="right">
            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: t.ink,
                color: t.paper,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              DU
            </Avatar>
          </Tooltip>
        ) : (
          <>
            <Avatar
              sx={{
                width: 26,
                height: 26,
                bgcolor: t.ink,
                color: t.paper,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              DU
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.2 }}>
                Demo User
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  color: t.slate,
                  fontFamily: theme.palette.fonts.mono,
                }}
                noWrap
              >
                {personaMode === "admin" ? "admin" : "writer-manager"}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Collapse toggle moved to the brand block above — sits inline with
          the wordmark when expanded, alone when collapsed. */}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: t.paper }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          display: { xs: "flex", sm: "none" },
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
          // Smooth width transition when toggling between rail and drawer.
          // Both the nav slot and the Drawer paper transition together so
          // the main content slides over without a jump.
          transition: theme.transitions.create("width", {
            duration: 200,
          }),
        }}
      >
        {/* Mobile drawer — always expanded layout when open (no rail mode
            on small screens; the screen is the drawer when it's there). */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH_EXPANDED,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent(false)}
        </Drawer>
        {/* Desktop drawer — collapsible between rail (72) and full (272). */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              overflowX: "hidden",
              transition: theme.transitions.create("width", {
                duration: 200,
              }),
            },
          }}
          open
        >
          {drawerContent(collapsed)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          // Page body lives on pure white. The drawer's surfaceContainerLow
          // tint provides the visual separation; no border needed.
          bgcolor: t.paper,
          transition: theme.transitions.create("width", {
            duration: 200,
          }),
        }}
      >
        <Toolbar sx={{ display: { sm: "none" } }} />
        <Box sx={{ px: { xs: 3, md: 6, lg: 8 }, py: { xs: 4, md: 6 } }}>
          <Outlet />
        </Box>
      </Box>

    </Box>
  );
}


function PersonaSwitcher({
  compact,
  mode,
  onChange,
}: {
  compact: boolean;
  mode: PersonaMode;
  onChange: (mode: PersonaMode) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  if (compact) {
    const next = mode === "admin" ? "non-admin" : "admin";
    return (
      <Box sx={{ px: 0.5, pb: 1 }}>
        <Tooltip title={`Switch to ${next === "admin" ? "Admin" : "Non Admin"}`} placement="right">
          <IconButton
            size="small"
            onClick={() => onChange(next)}
            sx={{
              width: 48,
              height: 40,
              mx: "auto",
              display: "flex",
              color: mode === "admin" ? t.pepsiBlueStrong : t.slate,
              bgcolor: mode === "admin" ? t.pepsiBlueSubtle : "transparent",
              "&:hover": { bgcolor: alpha(t.ink, 0.04) },
            }}
            aria-label="Switch persona"
          >
            {mode === "admin" ? (
              <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 18 }} />
            ) : (
              <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 1.5, pb: 1.5 }}>
      <TextField
        select
        size="small"
        fullWidth
        label="POC view"
        value={mode}
        onChange={(e) => onChange(e.target.value as PersonaMode)}
        SelectProps={{ MenuProps: { PaperProps: { sx: { mt: 0.5 } } } }}
        sx={{
          "& .MuiInputBase-root": {
            height: 36,
            borderRadius: 999,
            bgcolor: t.surfaceContainerLow,
            fontSize: "0.75rem",
            fontWeight: 600,
          },
          "& .MuiInputLabel-root": { fontSize: "0.75rem" },
          "& .MuiSelect-select": { py: 0.75 },
        }}
      >
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="non-admin">Non Admin</MenuItem>
      </TextField>
    </Box>
  );
}

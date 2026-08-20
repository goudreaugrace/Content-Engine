import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CardActionArea,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import { KpiItem, KpiRow } from "../components/kpi-row";
import {
  CURRENT_TEAM_ADMIN_ID,
  HANDOFF_ARTICLES_BY_MEMBER,
  KNOWLEDGE_BASE_OPTIONS,
  OUTSIDE_TEAM_MEMBERS,
  SECTOR_OPTIONS,
  TEAM_ADMINS,
  TEAM_ADMIN_KB_ACCESS,
  TEAM_ADMIN_SECTOR_ACCESS,
  getTeamPermissionsState,
  getTeamPermissionsAlertCount,
  markTeamPermissionsOutcomesSeen,
  saveTeamPermissionsState,
  teamAdminName,
  teamMemberName,
  type HandoffChoice,
  type TeamMember,
  type TeamPermissionsState,
  type TeamRole,
  type TransferRequest,
} from "../lib/team-permissions";

type TabValue = "members" | "transfers" | "activity";
type RemovalTiming = "" | "immediate" | "scheduled";

type MemberFormValue = {
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
  sectors: string[];
  knowledgeBases: string[];
};

const EMPTY_MEMBER_FORM: MemberFormValue = {
  firstName: "",
  lastName: "",
  email: "",
  role: "content-owner",
  sectors: [],
  knowledgeBases: [],
};

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function teamAdminTeam(id: string) {
  return TEAM_ADMINS.find((admin) => admin.id === id)?.team ?? "another team";
}

function optionLabels(ids: string[], options: Array<{ id: string; label: string }>) {
  return ids.map((id) => options.find((option) => option.id === id)?.label ?? id);
}

export default function TeamPermissions() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<TeamPermissionsState>(() => getTeamPermissionsState());
  const [tab, setTab] = useState<TabValue>(() =>
    searchParams.get("tab") === "transfers" ? "transfers" : "members",
  );
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormValue>(EMPTY_MEMBER_FORM);
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [removalTiming, setRemovalTiming] = useState<RemovalTiming>("");
  const [removalDate, setRemovalDate] = useState("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [outsideMemberId, setOutsideMemberId] = useState("");
  const [transferFirstName, setTransferFirstName] = useState("");
  const [transferLastName, setTransferLastName] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [decisionRequest, setDecisionRequest] = useState<TransferRequest | null>(null);
  const [messageRequest, setMessageRequest] = useState<TransferRequest | null>(null);
  const [decisionMode, setDecisionMode] = useState<"approve" | "decline">("approve");
  const [handoffChoices, setHandoffChoices] = useState<Record<string, HandoffChoice>>({});
  const [successors, setSuccessors] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [toast, setToast] = useState("");
  const [attentionCount, setAttentionCount] = useState(getTeamPermissionsAlertCount);

  useEffect(() => {
    if (tab === "transfers") {
      markTeamPermissionsOutcomesSeen();
      setAttentionCount(getTeamPermissionsAlertCount());
    }
  }, [tab]);

  const persist = (next: TeamPermissionsState) => {
    setState(saveTeamPermissionsState(next));
    setAttentionCount(getTeamPermissionsAlertCount());
  };

  const currentMembers = useMemo(
    () => state.members.filter(
      (member) =>
        member.teamAdminId === CURRENT_TEAM_ADMIN_ID &&
        member.status !== "inactive" &&
        !(member.status === "scheduled-removal" && member.accessEndsAt && new Date(member.accessEndsAt).getTime() <= Date.now()),
    ),
    [state.members],
  );
  const incoming = state.transfers.filter(
    (request) => request.receiverAdminId === CURRENT_TEAM_ADMIN_ID,
  );
  const outgoing = state.transfers.filter(
    (request) => request.senderAdminId === CURRENT_TEAM_ADMIN_ID,
  );
  const pendingCount = state.transfers.filter(
    (request) =>
      request.status === "pending" &&
      (request.receiverAdminId === CURRENT_TEAM_ADMIN_ID ||
        request.senderAdminId === CURRENT_TEAM_ADMIN_ID),
  ).length;
  const activeHandoffs = state.handoffs.filter(
    (handoff) => !handoff.successorMemberId && new Date(handoff.deadline).getTime() > Date.now(),
  ).length;
  const transferSearchStarted = Boolean(
    transferFirstName.trim() || transferLastName.trim() || transferEmail.trim(),
  );
  const transferMatches = OUTSIDE_TEAM_MEMBERS.filter((person) => {
    const [firstName, ...lastNameParts] = person.name.split(" ");
    const lastName = lastNameParts.join(" ");
    return (
      (!transferFirstName.trim() || firstName.toLowerCase().includes(transferFirstName.trim().toLowerCase())) &&
      (!transferLastName.trim() || lastName.toLowerCase().includes(transferLastName.trim().toLowerCase())) &&
      (!transferEmail.trim() || person.email.toLowerCase().includes(transferEmail.trim().toLowerCase()))
    );
  });
  const selectedTransferPerson = OUTSIDE_TEAM_MEMBERS.find(
    (person) => person.id === outsideMemberId,
  );

  const openTransferRequest = () => {
    setOutsideMemberId("");
    setTransferFirstName("");
    setTransferLastName("");
    setTransferEmail("");
    setTransferMessage("");
    setTransferDialogOpen(true);
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm(EMPTY_MEMBER_FORM);
    setMemberDialogOpen(true);
  };

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setMemberForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      sectors: member.sectors,
      knowledgeBases: member.knowledgeBases,
    });
    setMemberDialogOpen(true);
  };

  const memberFormValid =
    memberForm.firstName.trim() &&
    memberForm.lastName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberForm.email) &&
    memberForm.sectors.length > 0 &&
    memberForm.knowledgeBases.length > 0;

  const saveMember = () => {
    if (!memberFormValid) return;
    if (editingMember) {
      persist({
        ...state,
        members: state.members.map((member) =>
          member.id === editingMember.id ? { ...member, ...memberForm } : member,
        ),
      });
      setToast(`${memberForm.firstName} ${memberForm.lastName}’s permissions were updated.`);
    } else {
      const id = `${memberForm.firstName}-${memberForm.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const nextMember: TeamMember = {
        id,
        contentOwnerKey: `${memberForm.firstName} ${memberForm.lastName}`,
        ...memberForm,
        status: "new",
        teamAdminId: CURRENT_TEAM_ADMIN_ID,
      };
      persist({ ...state, members: [...state.members, nextMember] });
      setToast(`Invitation sent to ${memberForm.email}.`);
    }
    setMemberDialogOpen(false);
  };

  const openHandoffDialog = (member: TeamMember) => {
    const articles = HANDOFF_ARTICLES_BY_MEMBER[member.id] ?? [];
    const existingHandoffs = state.handoffs.filter(
      (handoff) => handoff.departingMemberId === member.id,
    );
    setHandoffChoices(
      Object.fromEntries(
        articles.map((article) => [
          article.articleId,
          existingHandoffs.find((handoff) => handoff.articleId === article.articleId)?.choice ?? "assign-later",
        ]),
      ),
    );
    setSuccessors(
      Object.fromEntries(
        existingHandoffs
          .filter((handoff) => handoff.successorMemberId)
          .map((handoff) => [handoff.articleId, handoff.successorMemberId!]),
      ),
    );
    setRemovalTiming(member.status === "scheduled-removal" ? "scheduled" : "");
    setRemovalDate(member.accessEndsAt ? member.accessEndsAt.slice(0, 10) : "");
    setAcknowledged(false);
    setRemoveMember(member);
  };

  const changeRemovalTiming = (timing: RemovalTiming) => {
    setRemovalTiming(timing);
    if (timing === "immediate") {
      setHandoffChoices((current) =>
        Object.fromEntries(
          Object.entries(current).map(([articleId, choice]) => [
            articleId,
            choice === "co-owner" ? "assign-later" : choice,
          ]),
        ),
      );
    }
  };

  const completeRemoval = () => {
    if (!removeMember) return;
    if (!removalTiming || (removalTiming === "scheduled" && !removalDate)) return;
    const articles = HANDOFF_ARTICLES_BY_MEMBER[removeMember.id] ?? [];
    const needsAcknowledgement = articles.some(
      (article) => handoffChoices[article.articleId] === "assign-later",
    );
    if (needsAcknowledgement && !acknowledged) return;
    const deadline =
      removalTiming === "immediate"
        ? new Date().toISOString()
        : new Date(`${removalDate}T17:00:00`).toISOString();
    const newHandoffs = articles.map((article) => ({
      ...article,
      departingMemberId: removeMember.id,
      choice: handoffChoices[article.articleId] ?? "assign-later",
      successorMemberId: successors[article.articleId] || undefined,
      startedAt: new Date().toISOString(),
      deadline,
    }));
    persist({
      ...state,
      members: state.members.map((member) =>
        member.id === removeMember.id
          ? {
              ...member,
              status: removalTiming === "immediate" ? "inactive" : "scheduled-removal",
              accessEndsAt: deadline,
            }
          : member,
      ),
      handoffs: [
        ...state.handoffs.filter((handoff) => handoff.departingMemberId !== removeMember.id),
        ...newHandoffs,
      ],
    });
    setRemoveMember(null);
    setToast(
      removalTiming === "immediate"
        ? `${teamMemberName(removeMember)}’s portal access was removed.`
        : `${teamMemberName(removeMember)}’s access is scheduled to end ${dateLabel(deadline)}.`,
    );
  };

  const cancelScheduledRemoval = () => {
    if (!removeMember) return;
    persist({
      ...state,
      members: state.members.map((member) =>
        member.id === removeMember.id
          ? { ...member, status: "active", accessEndsAt: undefined }
          : member,
      ),
      handoffs: state.handoffs.filter(
        (handoff) => handoff.departingMemberId !== removeMember.id,
      ),
    });
    setRemoveMember(null);
    setToast(`${teamMemberName(removeMember)}’s scheduled access removal was cancelled.`);
  };

  const requestTransfer = () => {
    const person = OUTSIDE_TEAM_MEMBERS.find((member) => member.id === outsideMemberId);
    if (!person) return;
    const id = `transfer-${Date.now()}`;
    const request: TransferRequest = {
      id,
      memberId: person.id,
      memberName: person.name,
      memberEmail: person.email,
      senderAdminId: CURRENT_TEAM_ADMIN_ID,
      receiverAdminId: person.currentAdminId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      message: transferMessage.trim() || undefined,
    };
    persist({
      ...state,
      transfers: [...state.transfers, request],
      transferLog: [
        ...state.transferLog,
        {
          id: `log-${Date.now()}`,
          requestId: id,
          action: "requested",
          actorAdminId: CURRENT_TEAM_ADMIN_ID,
          occurredAt: request.requestedAt,
          note: `You requested ${person.name}’s transfer from ${teamAdminTeam(person.currentAdminId)} to your team.`,
        },
      ],
    });
    setTransferDialogOpen(false);
    setToast(`Transfer request sent to ${teamAdminName(person.currentAdminId)}.`);
  };

  const cancelTransfer = (request: TransferRequest) => {
    const updatedAt = new Date().toISOString();
    persist({
      ...state,
      transfers: state.transfers.map((item) =>
        item.id === request.id ? { ...item, status: "cancelled", updatedAt } : item,
      ),
      transferLog: [
        ...state.transferLog,
        {
          id: `log-${Date.now()}`,
          requestId: request.id,
          action: "cancelled",
          actorAdminId: CURRENT_TEAM_ADMIN_ID,
          occurredAt: updatedAt,
          note: `You cancelled the transfer request for ${request.memberName}.`,
        },
      ],
    });
    setToast("Transfer request cancelled. The receiver’s message has been updated.");
  };

  const openDecision = (request: TransferRequest, mode: "approve" | "decline") => {
    setDecisionRequest(request);
    setDecisionMode(mode);
    setAcknowledged(false);
    const articles = HANDOFF_ARTICLES_BY_MEMBER[request.memberId] ?? [];
    setHandoffChoices(
      Object.fromEntries(articles.map((article) => [article.articleId, "assign-later"])),
    );
    setSuccessors({});
  };

  const saveDecision = () => {
    if (!decisionRequest) return;
    const articles = HANDOFF_ARTICLES_BY_MEMBER[decisionRequest.memberId] ?? [];
    const needsAcknowledgement =
      decisionMode === "approve" &&
      articles.some((article) => handoffChoices[article.articleId] === "assign-later");
    if (needsAcknowledgement && !acknowledged) return;
    const updatedAt = new Date().toISOString();
    const nextStatus = decisionMode === "approve" ? "approved" : "declined";
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newHandoffs =
      decisionMode === "approve"
        ? articles.map((article) => ({
            ...article,
            departingMemberId: decisionRequest.memberId,
            choice: handoffChoices[article.articleId] ?? "assign-later",
            successorMemberId: successors[article.articleId] || undefined,
            startedAt: updatedAt,
            deadline,
          }))
        : [];
    persist({
      ...state,
      transfers: state.transfers.map((request) =>
        request.id === decisionRequest.id
          ? { ...request, status: nextStatus, updatedAt }
          : request,
      ),
      members:
        decisionMode === "approve"
          ? state.members.map((member) =>
              member.id === decisionRequest.memberId
                ? { ...member, status: "handoff", handoffEndsAt: deadline }
                : member,
            )
          : state.members,
      handoffs: [...state.handoffs, ...newHandoffs],
      transferLog: [
        ...state.transferLog,
        {
          id: `log-${Date.now()}`,
          requestId: decisionRequest.id,
          action: decisionMode === "approve" ? "accepted" : "declined",
          actorAdminId: CURRENT_TEAM_ADMIN_ID,
          occurredAt: updatedAt,
          note:
            decisionMode === "approve"
              ? `You approved ${decisionRequest.memberName}’s transfer. The 30-day handoff ends ${dateLabel(deadline)}.`
              : `You declined ${decisionRequest.memberName}’s transfer request.`,
        },
      ],
    });
    setDecisionRequest(null);
    setToast(
      decisionMode === "approve"
        ? "Transfer approved. The 30-day handoff has started."
        : "Transfer request declined.",
    );
  };

  return (
    <Box sx={{ maxWidth: 1180, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "flex-end" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Team Permissions
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "72ch" }}>
            Manage who can create content for your team, where they can publish, and how access moves when roles change.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openAddMember}>
          Add Team Member
        </Button>
      </Stack>

      <Box sx={{ mt: 4 }}>
        <KpiRow>
          <KpiItem label="Team members" value={currentMembers.length} />
          <KpiItem label="New members" value={currentMembers.filter((member) => member.status === "new").length} accent={t.pepsiBlue} />
          <KpiItem label="Pending transfers" value={pendingCount} accent={pendingCount ? t.ember : undefined} />
          <KpiItem label="Handoffs open" value={activeHandoffs} accent={activeHandoffs ? t.ember : undefined} />
        </KpiRow>
      </Box>

      <Card sx={{ mt: 3, p: 2.25, bgcolor: t.surfaceContainerLow }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">Your permission limits</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              You can only grant sector and knowledge-base access that is already included in your Team Admin profile.
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {optionLabels(TEAM_ADMIN_SECTOR_ACCESS, SECTOR_OPTIONS).map((label) => (
              <Chip key={label} size="small" label={label} variant="outlined" />
            ))}
            {optionLabels(TEAM_ADMIN_KB_ACCESS, KNOWLEDGE_BASE_OPTIONS).map((label) => (
              <Chip key={label} size="small" label={label} color="primary" variant="outlined" />
            ))}
          </Stack>
        </Stack>
      </Card>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mt: 3, borderBottom: `1px solid ${t.border}` }}
      >
        <Tab value="members" label="Team Members" />
        <Tab
          value="transfers"
          label={
            <Stack direction="row" spacing={0.75} alignItems="center" component="span">
              <Box component="span">Profile Transfers</Box>
              {attentionCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    minWidth: 20,
                    height: 20,
                    px: 0.65,
                    borderRadius: 999,
                    bgcolor: t.ember,
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {attentionCount > 99 ? "99+" : attentionCount}
                </Box>
              )}
            </Stack>
          }
        />
        <Tab value="activity" label="Transfer Activity" />
      </Tabs>

      {tab === "members" && (
        <Box sx={{ mt: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Sectors</TableCell>
                  <TableCell>Knowledge bases</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentMembers.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography sx={{ fontWeight: 600 }}>{teamMemberName(member)}</Typography>
                            {member.status === "new" && <Chip size="small" label="New" color="primary" />}
                            {member.status === "handoff" && <Chip size="small" label="Handoff" color="warning" />}
                            {member.status === "scheduled-removal" && <Chip size="small" label="Access Ending" color="warning" />}
                          </Stack>
                          <Typography variant="caption">{member.email}</Typography>
                          {member.handoffEndsAt && (
                            <Typography variant="caption" display="block" sx={{ color: t.emberStrong }}>
                              Handoff ends {dateLabel(member.handoffEndsAt)}
                            </Typography>
                          )}
                          {member.accessEndsAt && member.status === "scheduled-removal" && (
                            <Typography variant="caption" display="block" sx={{ color: t.emberStrong }}>
                              Access ends {dateLabel(member.accessEndsAt)}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{member.role === "team-admin" ? "Team Admin" : "Content Owner"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {optionLabels(member.sectors, SECTOR_OPTIONS).map((label) => (
                          <Chip key={label} size="small" label={label} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {optionLabels(member.knowledgeBases, KNOWLEDGE_BASE_OPTIONS).map((label) => (
                          <Chip key={label} size="small" label={label} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit permissions">
                        <IconButton size="small" onClick={() => openEditMember(member)}>
                          <EditOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={member.status === "scheduled-removal" ? "Review scheduled removal" : "Remove access"}>
                        <IconButton size="small" onClick={() => openHandoffDialog(member)}>
                          <PersonRemoveOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === "transfers" && (
        <Stack spacing={4} sx={{ mt: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "flex-start" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6">Request a profile transfer</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: "72ch" }}>
                Have a new member on your team who is from another part of your org and already has access? Request their profile transfer to your team here.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<SwapHorizRoundedIcon />}
              onClick={openTransferRequest}
            >
              Request Transfer
            </Button>
          </Stack>

          <TransferSection
            title="Requests sent to you"
            requests={incoming}
            perspective="receiver"
            onApprove={(request) => openDecision(request, "approve")}
            onDecline={(request) => openDecision(request, "decline")}
            onViewMessage={setMessageRequest}
          />
          <TransferSection
            title="Requests you sent"
            requests={outgoing}
            perspective="sender"
            onCancel={cancelTransfer}
          />
        </Stack>
      )}

      {tab === "activity" && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="info" icon={<HistoryOutlinedIcon />} sx={{ mb: 2 }}>
            This log shows profile-transfer requests involving your team. “You” refers to Casey Morgan. Decisions are retained for Super Admin review but are not scored against either Team Admin.
          </Alert>
          <Stack spacing={1.25}>
            {[...state.transferLog]
              .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
              .map((entry) => (
                <Card key={entry.id} sx={{ p: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{entry.note}</Typography>
                      <Typography variant="caption">
                        {entry.actorAdminId === CURRENT_TEAM_ADMIN_ID ? "You" : teamAdminName(entry.actorAdminId)} · {entry.action}
                      </Typography>
                    </Box>
                    <Typography variant="caption">{dateLabel(entry.occurredAt)}</Typography>
                  </Stack>
                </Card>
              ))}
          </Stack>
        </Box>
      )}

      <MemberDialog
        open={memberDialogOpen}
        editing={Boolean(editingMember)}
        value={memberForm}
        onChange={setMemberForm}
        onClose={() => setMemberDialogOpen(false)}
        onSave={saveMember}
        valid={Boolean(memberFormValid)}
      />

      <Dialog open={Boolean(messageRequest)} onClose={() => setMessageRequest(null)} maxWidth="sm" fullWidth>
        {messageRequest && (
          <>
            <DialogTitle>Profile transfer request: {messageRequest.memberName}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  From {teamAdminName(messageRequest.senderAdminId)} · Team Admin
                </Typography>
                <Typography sx={{ lineHeight: 1.65 }}>
                  {teamAdminName(messageRequest.senderAdminId)} has requested {messageRequest.memberName}’s transfer from your team to {teamAdminTeam(messageRequest.senderAdminId)}. The 30-day article handoff will begin only if you approve the request.
                </Typography>
                {messageRequest.message && (
                  <Box sx={{ p: 1.75, borderRadius: 1.5, bgcolor: t.surfaceContainerLow }}>
                    <Typography variant="caption" color="text.secondary">
                      Message from {teamAdminName(messageRequest.senderAdminId)}
                    </Typography>
                    <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {messageRequest.message}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMessageRequest(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Profile Transfer</DialogTitle>
        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Search for someone who already has access. Their current Team Admin will receive the request and must approve or decline it.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                fullWidth
                size="small"
                label="First Name"
                value={transferFirstName}
                onChange={(event) => {
                  setTransferFirstName(event.target.value);
                  setOutsideMemberId("");
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Last Name"
                value={transferLastName}
                onChange={(event) => {
                  setTransferLastName(event.target.value);
                  setOutsideMemberId("");
                }}
              />
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Work Email"
              value={transferEmail}
              onChange={(event) => {
                setTransferEmail(event.target.value);
                setOutsideMemberId("");
              }}
            />

            {!transferSearchStarted && (
              <Typography variant="body2" color="text.secondary">
                Enter a name or work email to find a matching profile.
              </Typography>
            )}
            {transferSearchStarted && transferMatches.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Select a Profile</Typography>
                {transferMatches.map((person) => {
                  const selected = outsideMemberId === person.id;
                  return (
                    <Card
                      key={person.id}
                      variant="outlined"
                      sx={{ borderColor: selected ? t.pepsiBlue : t.border, borderWidth: selected ? 2 : 1 }}
                    >
                      <CardActionArea onClick={() => setOutsideMemberId(person.id)} sx={{ p: 1.75 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography sx={{ fontWeight: 650 }}>{person.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{person.email}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {teamAdminName(person.currentAdminId)} · {teamAdminTeam(person.currentAdminId)}
                            </Typography>
                          </Box>
                          {selected && <Chip size="small" color="primary" label="Selected" />}
                        </Stack>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Stack>
            )}
            {transferSearchStarted && transferMatches.length === 0 && (
              <Alert severity="info" icon={false}>
                No existing profile matches your search. If this person is new to the portal, use Add Team Member instead.
              </Alert>
            )}

            {outsideMemberId && (
              <>
                {selectedTransferPerson && (
                  <Box sx={{ p: 2, border: `1px solid ${t.border}`, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2">Message Preview</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                      Casey Morgan has requested {selectedTransferPerson.name}’s transfer from your team to Employee Services. The 30-day article handoff will begin only if you approve the request.
                    </Typography>
                  </Box>
                )}
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Add a Message (Optional)"
                  placeholder="Add any helpful context for the current Team Admin."
                  value={transferMessage}
                  onChange={(event) => setTransferMessage(event.target.value)}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!outsideMemberId} onClick={requestTransfer}>Send Request</Button>
        </DialogActions>
      </Dialog>

      <HandoffDialog
        open={Boolean(removeMember)}
        title={removeMember ? `Remove ${teamMemberName(removeMember)}’s Access` : "Remove Access"}
        intro="Choose when this person’s access should end and what should happen to each article they own. Their profile and ownership history will be retained."
        member={removeMember}
        articles={removeMember ? HANDOFF_ARTICLES_BY_MEMBER[removeMember.id] ?? [] : []}
        choices={handoffChoices}
        successors={successors}
        members={currentMembers.filter((member) => member.id !== removeMember?.id)}
        acknowledged={acknowledged}
        onChoice={(articleId, choice) => setHandoffChoices((current) => ({ ...current, [articleId]: choice }))}
        onSuccessor={(articleId, memberId) => setSuccessors((current) => ({ ...current, [articleId]: memberId }))}
        onAcknowledged={setAcknowledged}
        accessRemoval
        removalTiming={removalTiming}
        removalDate={removalDate}
        onRemovalTiming={changeRemovalTiming}
        onRemovalDate={setRemovalDate}
        onCancelScheduled={removeMember?.status === "scheduled-removal" ? cancelScheduledRemoval : undefined}
        onClose={() => setRemoveMember(null)}
        onConfirm={completeRemoval}
        confirmLabel={removalTiming === "scheduled" ? "Schedule Access Removal" : "Remove Access"}
      />

      <HandoffDialog
        open={Boolean(decisionRequest)}
        title={decisionMode === "approve" ? "Approve profile transfer" : "Decline profile transfer"}
        intro={
          decisionMode === "approve"
            ? "Approval starts the 30-day handoff today. Choose what should happen to the articles that remain with your team."
            : "Declining closes this request. The decision is retained in the transfer log but is not counted against either Team Admin."
        }
        member={state.members.find((member) => member.id === decisionRequest?.memberId) ?? null}
        articles={decisionMode === "approve" && decisionRequest ? HANDOFF_ARTICLES_BY_MEMBER[decisionRequest.memberId] ?? [] : []}
        choices={handoffChoices}
        successors={successors}
        members={currentMembers.filter((member) => member.id !== decisionRequest?.memberId)}
        acknowledged={acknowledged}
        onChoice={(articleId, choice) => setHandoffChoices((current) => ({ ...current, [articleId]: choice }))}
        onSuccessor={(articleId, memberId) => setSuccessors((current) => ({ ...current, [articleId]: memberId }))}
        onAcknowledged={setAcknowledged}
        onClose={() => setDecisionRequest(null)}
        onConfirm={saveDecision}
        confirmLabel={decisionMode === "approve" ? "Approve Transfer" : "Decline Transfer"}
        destructive={decisionMode === "decline"}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4200}
        onClose={() => setToast("")}
        message={toast}
      />
    </Box>
  );
}

function TransferSection({
  title,
  requests,
  perspective,
  onApprove,
  onDecline,
  onCancel,
  onViewMessage,
}: {
  title: string;
  requests: TransferRequest[];
  perspective: "sender" | "receiver";
  onApprove?: (request: TransferRequest) => void;
  onDecline?: (request: TransferRequest) => void;
  onCancel?: (request: TransferRequest) => void;
  onViewMessage?: (request: TransferRequest) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1.25 }}>{title}</Typography>
      <Stack spacing={1.25}>
        {requests.length === 0 && (
          <Card sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No transfer requests here.</Typography>
          </Card>
        )}
        {requests.map((request) => {
          const otherAdminId = perspective === "sender" ? request.receiverAdminId : request.senderAdminId;
          const requiresDecision = request.status === "pending" && perspective === "receiver";
          return (
            <Card key={request.id} sx={{ p: 2.25 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {requiresDecision && (
                      <Box
                        aria-label="Action required"
                        sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: t.ember, flexShrink: 0 }}
                      />
                    )}
                    <Typography sx={{ fontWeight: 650 }}>{request.memberName}</Typography>
                    {requiresDecision ? (
                      <Chip
                        size="small"
                        label="Action required"
                        sx={{ bgcolor: t.emberBg, color: t.emberStrong, fontWeight: 650 }}
                      />
                    ) : (
                      <TransferStatusChip status={request.status} />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {perspective === "sender" ? "Current Team Admin" : "Requested by"}: {teamAdminName(otherAdminId)} · {teamAdminTeam(otherAdminId)}
                  </Typography>
                  <Typography variant="caption">Requested {dateLabel(request.requestedAt)}</Typography>
                  {request.status === "cancelled" && (
                    <Alert severity="info" icon={false} sx={{ mt: 1.5, py: 0.5 }}>
                      This request has been cancelled. Approval and decline are no longer available.
                    </Alert>
                  )}
                </Box>
                {requiresDecision && (
                  <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button size="small" variant="outlined" startIcon={<CloseOutlinedIcon />} onClick={() => onDecline?.(request)}>
                        Decline
                      </Button>
                      <Button size="small" variant="contained" startIcon={<CheckCircleOutlineIcon />} onClick={() => onApprove?.(request)}>
                        Approve
                      </Button>
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<MailOutlineRoundedIcon />}
                      onClick={() => onViewMessage?.(request)}
                    >
                      View Message
                    </Button>
                  </Stack>
                )}
                {request.status === "pending" && perspective === "sender" && (
                  <Button size="small" variant="outlined" color="inherit" startIcon={<CancelOutlinedIcon />} onClick={() => onCancel?.(request)} sx={{ alignSelf: { md: "center" } }}>
                    Cancel Request
                  </Button>
                )}
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}

function TransferStatusChip({ status }: { status: TransferRequest["status"] }) {
  const config = {
    pending: { label: "Pending", color: "warning" as const },
    approved: { label: "Approved", color: "success" as const },
    declined: { label: "Declined", color: "default" as const },
    cancelled: { label: "Cancelled", color: "default" as const },
  }[status];
  return <Chip size="small" label={config.label} color={config.color} />;
}

function MemberDialog({
  open,
  editing,
  value,
  onChange,
  onClose,
  onSave,
  valid,
}: {
  open: boolean;
  editing: boolean;
  value: MemberFormValue;
  onChange: (value: MemberFormValue) => void;
  onClose: () => void;
  onSave: () => void;
  valid: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? "Edit team member" : "Add team member"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          {!editing && (
            <Alert severity="info" icon={false}>
              Saving this form sends an email invitation. It does not create an invitation message in the portal. New Content Owners receive a welcome message after signing in.
            </Alert>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField required fullWidth size="small" label="First name" value={value.firstName} onChange={(event) => onChange({ ...value, firstName: event.target.value })} />
            <TextField required fullWidth size="small" label="Last name" value={value.lastName} onChange={(event) => onChange({ ...value, lastName: event.target.value })} />
          </Stack>
          <TextField required fullWidth size="small" type="email" label="Company email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} />
          <TextField select required fullWidth size="small" label="Portal role" value={value.role} onChange={(event) => onChange({ ...value, role: event.target.value as TeamRole })}>
            <MenuItem value="content-owner">Content Owner</MenuItem>
            <MenuItem value="team-admin">Team Admin</MenuItem>
          </TextField>
          <MultiSelectField label="Sector access" value={value.sectors} options={SECTOR_OPTIONS.filter((option) => TEAM_ADMIN_SECTOR_ACCESS.includes(option.id))} onChange={(sectors) => onChange({ ...value, sectors })} />
          <MultiSelectField label="Knowledge-base access" value={value.knowledgeBases} options={KNOWLEDGE_BASE_OPTIONS.filter((option) => TEAM_ADMIN_KB_ACCESS.includes(option.id))} onChange={(knowledgeBases) => onChange({ ...value, knowledgeBases })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid} onClick={onSave}>{editing ? "Save Changes" : "Send Invitation"}</Button>
      </DialogActions>
    </Dialog>
  );
}

function MultiSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: Array<{ id: string; label: string }>;
  onChange: (value: string[]) => void;
}) {
  return (
    <FormControl required size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        label={label}
        value={value}
        onChange={(event) => onChange(typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value)}
        renderValue={(selected) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {optionLabels(selected, options).map((item) => <Chip key={item} size="small" label={item} />)}
          </Stack>
        )}
      >
        {options.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
      </Select>
      <FormHelperText>Limited to permissions in your Team Admin profile.</FormHelperText>
    </FormControl>
  );
}

function HandoffDialog({
  open,
  title,
  intro,
  member,
  articles,
  choices,
  successors,
  members,
  acknowledged,
  onChoice,
  onSuccessor,
  onAcknowledged,
  onClose,
  onConfirm,
  confirmLabel,
  destructive = false,
  accessRemoval = false,
  removalTiming = "",
  removalDate = "",
  onRemovalTiming,
  onRemovalDate,
  onCancelScheduled,
}: {
  open: boolean;
  title: string;
  intro: string;
  member: TeamMember | null;
  articles: Array<{ articleId: string; articleTitle: string }>;
  choices: Record<string, HandoffChoice>;
  successors: Record<string, string>;
  members: TeamMember[];
  acknowledged: boolean;
  onChoice: (articleId: string, choice: HandoffChoice) => void;
  onSuccessor: (articleId: string, memberId: string) => void;
  onAcknowledged: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  destructive?: boolean;
  accessRemoval?: boolean;
  removalTiming?: RemovalTiming;
  removalDate?: string;
  onRemovalTiming?: (timing: RemovalTiming) => void;
  onRemovalDate?: (date: string) => void;
  onCancelScheduled?: () => void;
}) {
  const hasAssignLater = articles.some((article) => choices[article.articleId] === "assign-later");
  const missingSuccessor = articles.some(
    (article) =>
      ["assign-now", "co-owner"].includes(choices[article.articleId]) &&
      !successors[article.articleId],
  );
  const timingValid =
    !accessRemoval ||
    removalTiming === "immediate" ||
    (removalTiming === "scheduled" && Boolean(removalDate));
  const valid = timingValid && !missingSuccessor && (!hasAssignLater || acknowledged);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">{intro}</Typography>
        {member && <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>{member.email}</Typography>}
        {accessRemoval && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2">When Should Access End?</Typography>
            <RadioGroup
              value={removalTiming}
              onChange={(event) => onRemovalTiming?.(event.target.value as RemovalTiming)}
              sx={{ mt: 0.5 }}
            >
              <FormControlLabel value="immediate" control={<Radio size="small" />} label="Immediately" />
              <FormControlLabel value="scheduled" control={<Radio size="small" />} label="On a Selected Date" />
            </RadioGroup>
            {removalTiming === "scheduled" && (
              <TextField
                required
                type="date"
                size="small"
                label="Access End Date"
                value={removalDate}
                onChange={(event) => onRemovalDate?.(event.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().slice(0, 10) }}
                sx={{ mt: 1, minWidth: 220 }}
              />
            )}
          </Box>
        )}
        {articles.length > 0 && (
          <Stack spacing={1.5} sx={{ mt: 2.5 }}>
            {articles.map((article) => (
              <Card key={article.articleId} sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 600 }}>{article.articleTitle}</Typography>
                <Typography variant="caption">{article.articleId}</Typography>
                <RadioGroup
                  value={choices[article.articleId] ?? "assign-later"}
                  onChange={(event) => onChoice(article.articleId, event.target.value as HandoffChoice)}
                  sx={{ mt: 1 }}
                >
                  <FormControlLabel value="assign-now" control={<Radio size="small" />} label="Assign a New Owner Now" />
                  {(!accessRemoval || removalTiming === "scheduled") && (
                    <FormControlLabel
                      value="co-owner"
                      control={<Radio size="small" />}
                      label={accessRemoval ? "Add a Transition Owner Until Access Ends" : "Add a Second Owner for the 30-Day Handoff"}
                    />
                  )}
                  <FormControlLabel value="assign-later" control={<Radio size="small" />} label="Assign This Article Later" />
                </RadioGroup>
                {["assign-now", "co-owner"].includes(choices[article.articleId]) && (
                  <TextField
                    select
                    required
                    fullWidth
                    size="small"
                    label="Successor"
                    value={successors[article.articleId] ?? ""}
                    onChange={(event) => onSuccessor(article.articleId, event.target.value)}
                    sx={{ mt: 1 }}
                  >
                    {members.map((candidate) => <MenuItem key={candidate.id} value={candidate.id}>{teamMemberName(candidate)}</MenuItem>)}
                  </TextField>
                )}
              </Card>
            ))}
          </Stack>
        )}
        {hasAssignLater && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} />}
              label={
                accessRemoval
                  ? `I understand that unassigned articles cannot be updated after access ends, and I accept responsibility for assigning them${removalTiming === "scheduled" && removalDate ? ` by ${dateLabel(`${removalDate}T17:00:00`)}` : " immediately"}.`
                  : "I understand that unassigned articles cannot be updated until a new owner is selected, and I accept responsibility for assigning them within 30 days."
              }
              sx={{ m: 0, alignItems: "flex-start" }}
            />
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {onCancelScheduled && (
          <Button color="error" onClick={onCancelScheduled} sx={{ mr: "auto" }}>
            Cancel Scheduled Removal
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button color={destructive ? "error" : "primary"} variant="contained" disabled={!valid} onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

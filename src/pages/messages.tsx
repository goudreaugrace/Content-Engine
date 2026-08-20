import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import { usePersonaMode, type PersonaMode } from "../lib/persona";
import {
  emptyMessageTrash,
  getReadMessageIds,
  getTrashedMessageRecords,
  markMessagesRead,
  MESSAGE_TRASH_POLICY,
  permanentlyDeleteTrashedMessage,
  restoreTrashedMessage,
  trashMessages,
  type TrashedMessageRecord,
} from "../lib/message-state";
import { getViewingContentOwner, subscribeToViewingContentOwner } from "../lib/content-owner-view";
import { getPOCReviewMessage } from "../lib/poc-review-messages";
import {
  CURRENT_TEAM_ADMIN_ID,
  getTeamPermissionsState,
  subscribeToTeamPermissions,
  teamAdminName,
  teamAdminTeam,
} from "../lib/team-permissions";

type Message = {
  id: string;
  subject: string;
  body: string;
  article: string;
  articlePath: string;
  sender: string;
  sentTo?: string;
  recipients: PersonaMode[];
  ownerNames?: string[];
  timestamp: string;
  unread: boolean;
  status: "Action needed" | "FYI" | "Resolved";
  actionLabel?: string;
  contextLabel?: string;
  hideContextAction?: boolean;
};

type MessageTopic = "article" | "owner-needed" | "transfer";

function messageTopic(message: Message): MessageTopic {
  if (message.id.startsWith("transfer-") || message.contextLabel === "Profile transfer") {
    return "transfer";
  }
  if (message.id.startsWith("owner-needed") || message.subject.toLowerCase().startsWith("owner needed")) {
    return "owner-needed";
  }
  return "article";
}

const MAYA_REVIEW_MESSAGE = getPOCReviewMessage("ka-0ff5f3a8")!;

function transferDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const MESSAGES: Message[] = [
  {
    id: "msg-1",
    subject: MAYA_REVIEW_MESSAGE.subject,
    body: MAYA_REVIEW_MESSAGE.body,
    article: "Something vague",
    articlePath: "/articles/ka-0ff5f3a8",
    sender: MAYA_REVIEW_MESSAGE.sender,
    recipients: ["non-admin"],
    ownerNames: ["Demo User"],
    timestamp: "Today · 10:24 AM",
    unread: true,
    status: "Action needed",
  },
  {
    id: "msg-2",
    subject: "SME note: include the payroll contact channel",
    body: "Consider adding the local payroll contact channel at the end of the article. This is a non-blocking recommendation from the subject-matter expert.",
    article: "How to update banking details across regions",
    articlePath: "/articles/ka-618766e0",
    sender: "Riley Chen · SME reviewer",
    recipients: ["non-admin", "admin"],
    ownerNames: ["Test"],
    timestamp: "Yesterday · 3:10 PM",
    unread: true,
    status: "FYI",
  },
  {
    id: "msg-3",
    subject: "Regional coverage needs review",
    body: "Several published articles are receiving views outside their intended regions. Please confirm location tags with the assigned owners.",
    article: "Content health: regional coverage",
    articlePath: "/",
    sender: "Morgan Chen · Super Admin",
    recipients: ["admin", "super-admin"],
    ownerNames: ["Demo User", "Test", "Demo", "Test Author"],
    timestamp: "Aug 11 · 9:05 AM",
    unread: true,
    status: "Action needed",
  },
  {
    id: "msg-4",
    subject: "Article published to myPepsiCo KB",
    body: "Your article is now published and available to employees. Its next review date has been scheduled.",
    article: "How to request a corporate credit card",
    articlePath: "/my-articles/pub-001",
    sender: "Content Engine",
    recipients: ["non-admin", "admin", "super-admin"],
    ownerNames: ["Test Author"],
    timestamp: "Aug 8 · 1:42 PM",
    unread: false,
    status: "FYI",
  },
  {
    id: "welcome-new-owner",
    subject: "Welcome to the Content Owner workspace",
    body: "Welcome, Nia! This workspace is where you will create articles, respond to review feedback, and keep your published content current. When you are ready, take the guided tour for a quick introduction to the main tools.",
    article: "Content Owner workspace",
    articlePath: "/?tour=welcome",
    sender: "Content Engine",
    recipients: ["non-admin"],
    ownerNames: ["New Owner"],
    timestamp: "Today · 9:00 AM",
    unread: true,
    status: "FYI",
    actionLabel: "Take Tour",
    contextLabel: "Getting started",
  },
  {
    id: "owner-needed-sofia",
    subject: "Owner needed: corporate credit card article",
    body: "Sofia Ramirez’s handoff is underway. Assign a successor to this article before August 30 so it remains editable after the transfer is complete.",
    article: "How to request a corporate credit card",
    articlePath: "/?tab=my-articles",
    sender: "Content Engine",
    recipients: ["admin"],
    timestamp: "Today · 8:15 AM",
    unread: true,
    status: "Action needed",
    actionLabel: "Review Article",
  },
];

const SENT_MESSAGES: Message[] = [
  {
    id: "sent-review-maya",
    subject: MAYA_REVIEW_MESSAGE.subject,
    body: MAYA_REVIEW_MESSAGE.body,
    article: "Something vague",
    articlePath: "/articles/ka-0ff5f3a8",
    sender: "You · Team Admin",
    sentTo: "Maya Johnson · Content Owner",
    recipients: ["admin"],
    timestamp: "Today · 10:24 AM",
    unread: false,
    status: "FYI",
  },
  {
    id: "sent-1",
    subject: "Please confirm the article's knowledge base",
    body: "Before approving this update, please confirm whether this belongs in myPepsiCo KB or PFP KB. I have included the current audience settings for reference.",
    article: "How to Apply for an Amex Card",
    articlePath: "/articles/a-001",
    sender: "You · Team Admin",
    sentTo: "Sofia Ramirez · Content Owner",
    recipients: ["admin", "super-admin"],
    timestamp: "Today · 9:40 AM",
    unread: false,
    status: "FYI",
  },
];

export default function Messages() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [personaMode] = usePersonaMode();
  const [viewingOwner, setViewingOwner] = useState(getViewingContentOwner);
  const [tab, setTab] = useState<"inbox" | "sent" | "trash">("inbox");
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadMessageIds());
  const [trashRecords, setTrashRecords] = useState<TrashedMessageRecord[]>(() =>
    getTrashedMessageRecords(personaMode),
  );
  const [statusFilter, setStatusFilter] = useState<"all" | Message["status"]>("all");
  const [topicFilter, setTopicFilter] = useState<"all" | MessageTopic>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [openMessage, setOpenMessage] = useState<Message | null>(null);
  const [permissionsState, setPermissionsState] = useState(getTeamPermissionsState);

  useEffect(
    () => subscribeToViewingContentOwner(() => setViewingOwner(getViewingContentOwner())),
    [],
  );
  useEffect(
    () => subscribeToTeamPermissions(() => setPermissionsState(getTeamPermissionsState())),
    [],
  );
  useEffect(() => setTrashRecords(getTrashedMessageRecords(personaMode)), [personaMode]);

  const transferInbox = useMemo<Message[]>(
    () =>
      permissionsState.transfers
        .filter((request) => request.receiverAdminId === CURRENT_TEAM_ADMIN_ID)
        .map((request) => {
          const handoff = permissionsState.handoffs.find(
            (item) => item.departingMemberId === request.memberId,
          );
          const subject =
            request.status === "cancelled"
              ? `Transfer request cancelled: ${request.memberName}`
              : request.status === "approved"
                ? `Transfer approved: ${request.memberName}`
                : request.status === "declined"
                  ? `Transfer declined: ${request.memberName}`
                  : `Profile transfer request: ${request.memberName}`;
          const body =
            request.status === "cancelled"
              ? `${teamAdminName(request.senderAdminId)} cancelled this request. Approval and decline are no longer available, but the event remains in Transfer Activity.`
              : request.status === "pending"
                ? `${teamAdminName(request.senderAdminId)} has requested ${request.memberName}’s transfer from your team to ${teamAdminTeam(request.senderAdminId)}. Review the request in Team Permissions. The 30-day article handoff begins only if you approve it.`
                : request.status === "approved"
                  ? `You approved ${request.memberName}’s transfer to ${teamAdminName(request.senderAdminId)}’s team. Their 30-day article handoff is underway${handoff ? ` and ends ${transferDate(handoff.deadline)}` : ""}.`
                  : `You declined ${request.memberName}’s transfer request. The decision remains available in Transfer Activity.`;
          const bodyWithMessage = request.message
            ? `${body}\n\nMessage from ${teamAdminName(request.senderAdminId)}: ${request.message}`
            : body;
          return {
            id: `transfer-message-${request.id}`,
            subject,
            body: bodyWithMessage,
            article: `${request.memberName} profile transfer`,
            articlePath: "/admin/team-permissions?tab=transfers",
            sender: `${teamAdminName(request.senderAdminId)} · Team Admin`,
            recipients: ["admin"],
            timestamp: request.updatedAt ? "Updated" : "Today",
            unread: request.status === "pending",
            status: request.status === "pending" ? "Action needed" : request.status === "cancelled" ? "Resolved" : "FYI",
            actionLabel:
              request.status === "pending"
                ? "Review Request"
                : request.status === "approved"
                  ? "View Handoff"
                  : request.status === "declined"
                    ? "View Transfer Log"
                    : undefined,
            contextLabel: "Profile transfer",
            hideContextAction: request.status === "cancelled",
          } satisfies Message;
        }),
    [permissionsState.transfers, permissionsState.handoffs],
  );

  const transferSent = useMemo<Message[]>(
    () =>
      permissionsState.transfers
        .filter((request) => request.senderAdminId === CURRENT_TEAM_ADMIN_ID)
        .map((request) => ({
          id: `transfer-sent-${request.id}`,
          subject: `Profile transfer request: ${request.memberName}`,
          body: `You requested ${request.memberName}’s transfer from ${teamAdminTeam(request.receiverAdminId)} to your team. ${teamAdminName(request.receiverAdminId)} is the Team Admin reviewing it. Current status: ${request.status}.${request.message ? `\n\nYour message: ${request.message}` : ""}`,
          article: `${request.memberName} profile transfer`,
          articlePath: "/admin/team-permissions?tab=transfers",
          sender: "You · Team Admin",
          sentTo: `${teamAdminName(request.receiverAdminId)} · Team Admin`,
          recipients: ["admin"],
          timestamp: "Today",
          unread: false,
          status: request.status === "cancelled" ? "Resolved" : "FYI",
          actionLabel: "View Request",
          contextLabel: "Profile transfer",
        })),
    [permissionsState.transfers],
  );

  const inbox = useMemo(() =>
    [...MESSAGES, ...transferInbox].filter(
      (message) =>
        message.recipients.includes(personaMode) &&
        !(personaMode === "admin" && message.sender.startsWith(`${teamAdminName(CURRENT_TEAM_ADMIN_ID)} ·`)) &&
        (personaMode !== "non-admin" || message.ownerNames?.includes(viewingOwner)),
    ),
  [personaMode, viewingOwner, transferInbox]);
  const trashedIds = useMemo(() => new Set(trashRecords.map((record) => record.id)), [trashRecords]);
  const visibleInbox = inbox.filter((message) => !trashedIds.has(message.id));
  const unread = visibleInbox.filter((message) => message.unread && !readIds.has(message.id));
  const sent = useMemo(
    () => [...SENT_MESSAGES, ...transferSent].filter((message) => message.recipients.includes(personaMode)),
    [personaMode, transferSent],
  );
  const visibleSent = sent.filter((message) => !trashedIds.has(message.id));
  const trashMessagesList = [...inbox, ...sent].filter((message) => trashedIds.has(message.id));
  const unfilteredMessages = tab === "inbox" ? visibleInbox : tab === "sent" ? visibleSent : trashMessagesList;
  const displayedMessages = unfilteredMessages.filter((message) => {
    if (statusFilter !== "all" && message.status !== statusFilter) return false;
    if (topicFilter !== "all" && messageTopic(message) !== topicFilter) return false;
    const isUnread = message.unread && !readIds.has(message.id);
    if (readFilter === "unread" && !isUnread) return false;
    if (readFilter === "read" && isUnread) return false;
    return true;
  });
  const deletableReadMessages = displayedMessages.filter(
    (message) => tab !== "trash" && (!message.unread || readIds.has(message.id)),
  );

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">Messages</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "65ch" }}>
            Keep review requests and decisions with the articles they relate to. Email notifications link back here, so the conversation is never lost in an inbox.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignSelf: { sm: "flex-start" } }}>
          {tab === "inbox" && unread.length > 0 && (
            <Button
              size="small"
              startIcon={<MarkEmailReadOutlinedIcon sx={{ fontSize: 17 }} />}
              onClick={() => setReadIds(markMessagesRead(unread.map((message) => message.id)))}
              sx={{ whiteSpace: "nowrap" }}
            >
              Mark all read
            </Button>
          )}
          {tab !== "trash" && deletableReadMessages.length > 0 && (
            <Button
              size="small"
              startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />}
              onClick={() =>
                setTrashRecords(
                  trashMessages(deletableReadMessages.map((message) => message.id), personaMode),
                )
              }
              sx={{ whiteSpace: "nowrap" }}
            >
              Delete Read
            </Button>
          )}
          {tab === "trash" && trashRecords.length > 0 && (
            <Button
              size="small"
              color="error"
              startIcon={<DeleteForeverOutlinedIcon sx={{ fontSize: 17 }} />}
              onClick={() => setTrashRecords(emptyMessageTrash(personaMode))}
              sx={{ whiteSpace: "nowrap" }}
            >
              Empty Trash
            </Button>
          )}
        </Stack>
      </Stack>

      <Alert severity="info" icon={false} sx={{ mt: 3, bgcolor: t.pepsiBlueSubtle, color: t.ink }}>
        <Typography variant="body2">
          <strong>POC preview:</strong> every in-product message also sends an email notification with its subject, message preview, and a direct article link.
        </Typography>
      </Alert>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mt: 3, borderBottom: `1px solid ${t.border}`, "& .MuiTab-root": { textTransform: "none", minHeight: 44, px: 0, mr: 3 }, "& .MuiTabs-indicator": { bgcolor: t.ink } }}
      >
        <Tab value="inbox" label={`Inbox${unread.length ? ` (${unread.length})` : ""}`} />
        <Tab value="sent" label="Sent" />
        <Tab value="trash" label={`Trash${trashRecords.length ? ` (${trashRecords.length})` : ""}`} />
      </Tabs>

      {tab === "trash" && (
        <Alert severity="info" icon={false} sx={{ mt: 2 }}>
          Messages stay in Trash for {MESSAGE_TRASH_POLICY.retentionDays} days. If there are more than {MESSAGE_TRASH_POLICY.maxMessages} messages, the oldest ones will be permanently deleted first.
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="message-topic-filter-label">Topic</InputLabel>
          <Select
            labelId="message-topic-filter-label"
            value={topicFilter}
            label="Topic"
            onChange={(event) => setTopicFilter(event.target.value as typeof topicFilter)}
          >
            <MenuItem value="all">All topics</MenuItem>
            <MenuItem value="owner-needed">Owner needed</MenuItem>
            <MenuItem value="transfer">Transfers</MenuItem>
            <MenuItem value="article">Article messages</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="message-status-filter-label">Status</InputLabel>
          <Select
            labelId="message-status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="Action needed">Action needed</MenuItem>
            <MenuItem value="FYI">FYI</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="message-read-filter-label">Read status</InputLabel>
          <Select
            labelId="message-read-filter-label"
            value={readFilter}
            label="Read status"
            onChange={(event) => setReadFilter(event.target.value as typeof readFilter)}
          >
            <MenuItem value="all">All messages</MenuItem>
            <MenuItem value="unread">Unread</MenuItem>
            <MenuItem value="read">Read</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {displayedMessages.map((message) => {
          const isUnread = message.unread && !readIds.has(message.id);
          return (
            <Card
              key={message.id}
              variant="outlined"
              onClick={() => {
                setReadIds(markMessagesRead([message.id]));
                setOpenMessage(message);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setReadIds(markMessagesRead([message.id]));
                  setOpenMessage(message);
                }
              }}
              sx={{
                borderColor: isUnread ? t.pepsiBlue : t.border,
                boxShadow: "none",
                cursor: "pointer",
                transition: "border-color 150ms ease, box-shadow 150ms ease",
                "&:hover": { borderColor: t.pepsiBlue, boxShadow: `0 3px 10px rgba(0, 0, 0, 0.06)` },
                "&:focus-visible": { outline: `2px solid ${t.pepsiBlue}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{ p: 2.25 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {isUnread && <Box aria-label="Unread message" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.pepsiBlue, flexShrink: 0 }} />}
                    <Typography sx={{ fontSize: "0.9375rem", fontWeight: isUnread ? 650 : 500, color: t.ink }}>
                      {message.subject}
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={message.status}
                    sx={{ alignSelf: { xs: "flex-start", sm: "center" }, bgcolor: message.status === "Action needed" ? t.emberBg : t.mist, color: message.status === "Action needed" ? t.emberStrong : t.slate, fontWeight: 600 }}
                  />
                </Stack>
                <Typography
                  sx={{
                    mt: 1,
                    fontSize: "0.875rem",
                    color: t.slate,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {message.body}
                </Typography>
                <Divider sx={{ my: 1.5, borderColor: t.border }} />
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: t.ink }}>{message.article}</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: "0.6875rem", color: t.granite }}>
                      {tab === "sent" && message.sentTo
                        ? `To ${message.sentTo} · ${message.timestamp}`
                        : `${message.sender} · ${message.timestamp}`}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      View Message
                    </Button>
                    {(message.status === "Action needed" || message.actionLabel) && !message.hideContextAction && (
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 15 }} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(message.articlePath);
                        }}
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {message.actionLabel ?? "Edit Article"}
                      </Button>
                    )}
                    {tab !== "trash" && !isUnread && (
                      <Tooltip title="Move to Trash">
                        <IconButton
                          size="small"
                          aria-label={`Move ${message.subject} to Trash`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setTrashRecords(trashMessages([message.id], personaMode));
                          }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {tab === "trash" && (
                      <>
                        <Tooltip title="Restore message">
                          <IconButton
                            size="small"
                            aria-label={`Restore ${message.subject}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setTrashRecords(restoreTrashedMessage(message.id, personaMode));
                            }}
                          >
                            <RestoreFromTrashOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete permanently">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Permanently delete ${message.subject}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setTrashRecords(permanentlyDeleteTrashedMessage(message.id, personaMode));
                            }}
                          >
                            <DeleteForeverOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Card>
          );
        })}
        {displayedMessages.length === 0 && (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2">
              {tab === "trash"
                ? "Trash is empty."
                : tab === "sent"
                  ? "No sent messages match these filters."
                  : "No inbox messages match these filters."}
            </Typography>
          </Box>
        )}
      </Stack>

      <Dialog open={Boolean(openMessage)} onClose={() => setOpenMessage(null)} maxWidth="sm" fullWidth>
        {openMessage && (
          <>
            <DialogTitle sx={{ pr: 7 }}>{openMessage.subject}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 0.5 }}>
                <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                  {tab === "sent" && openMessage.sentTo
                    ? `To ${openMessage.sentTo} · ${openMessage.timestamp}`
                    : `From ${openMessage.sender} · ${openMessage.timestamp}`}
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{openMessage.body}</Typography>
                <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: t.surfaceContainerLow }}>
                  <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.25 }}>{openMessage.contextLabel ?? "Related article"}</Typography>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{openMessage.article}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenMessage(null)}>Close</Button>
              {!openMessage.hideContextAction && (
                <Button
                  variant="contained"
                  endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    navigate(openMessage.articlePath);
                    setOpenMessage(null);
                  }}
                >
                  {openMessage.actionLabel ?? "Open article"}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

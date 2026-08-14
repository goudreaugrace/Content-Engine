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
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { usePersonaMode, type PersonaMode } from "../lib/persona";
import { getReadMessageIds, markMessagesRead } from "../lib/message-state";
import { getViewingContentOwner, subscribeToViewingContentOwner } from "../lib/content-owner-view";
import { getPOCReviewMessage } from "../lib/poc-review-messages";

type Message = {
  id: string;
  subject: string;
  body: string;
  article: string;
  articlePath: string;
  sender: string;
  recipients: PersonaMode[];
  ownerNames?: string[];
  timestamp: string;
  unread: boolean;
  status: "Action needed" | "FYI" | "Resolved";
};

const MAYA_REVIEW_MESSAGE = getPOCReviewMessage("ka-0ff5f3a8")!;

const MESSAGES: Message[] = [
  {
    id: "msg-1",
    subject: MAYA_REVIEW_MESSAGE.subject,
    body: MAYA_REVIEW_MESSAGE.body,
    article: "Something vague",
    articlePath: "/articles/ka-0ff5f3a8",
    sender: MAYA_REVIEW_MESSAGE.sender,
    recipients: ["non-admin", "admin"],
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
];

const SENT_MESSAGES: Message[] = [
  {
    id: "sent-1",
    subject: "Please confirm the article's knowledge base",
    body: "Before approving this update, please confirm whether this belongs in myPepsiCo KB or PFP KB. I have included the current audience settings for reference.",
    article: "How to Apply for an Amex Card",
    articlePath: "/articles/a-001",
    sender: "You · Team Admin",
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
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadMessageIds());
  const [openMessage, setOpenMessage] = useState<Message | null>(null);

  useEffect(
    () => subscribeToViewingContentOwner(() => setViewingOwner(getViewingContentOwner())),
    [],
  );

  const inbox = useMemo(() =>
    MESSAGES.filter(
      (message) =>
        message.recipients.includes(personaMode) &&
        (personaMode !== "non-admin" || message.ownerNames?.includes(viewingOwner)),
    ),
  [personaMode, viewingOwner]);
  const unread = inbox.filter((message) => message.unread && !readIds.has(message.id));
  const sent = useMemo(
    () => SENT_MESSAGES.filter((message) => message.recipients.includes(personaMode)),
    [personaMode],
  );
  const displayedMessages = tab === "inbox" ? inbox : sent;

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">Messages</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "65ch" }}>
            Keep review requests and decisions with the articles they relate to. Email notifications link back here, so the conversation is never lost in an inbox.
          </Typography>
        </Box>
        {unread.length > 0 && (
          <Button
            size="small"
            startIcon={<MarkEmailReadOutlinedIcon sx={{ fontSize: 17 }} />}
            onClick={() => setReadIds(markMessagesRead(unread.map((message) => message.id)))}
            sx={{ alignSelf: { sm: "flex-start" }, whiteSpace: "nowrap" }}
          >
            Mark all read
          </Button>
        )}
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
      </Tabs>

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
                    <Typography sx={{ mt: 0.25, fontSize: "0.6875rem", color: t.granite }}>{message.sender} · {message.timestamp}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      View Message
                    </Button>
                    {message.status === "Action needed" && (
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
                        Edit Article
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Card>
          );
        })}
        {tab === "sent" && sent.length === 0 && (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2">You have not sent any article messages yet.</Typography>
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
                  From {openMessage.sender} · {openMessage.timestamp}
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{openMessage.body}</Typography>
                <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: t.surfaceContainerLow }}>
                  <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.25 }}>Related article</Typography>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{openMessage.article}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenMessage(null)}>Close</Button>
              <Button
                variant="contained"
                endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => {
                  navigate(openMessage.articlePath);
                  setOpenMessage(null);
                }}
              >
                Open article
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

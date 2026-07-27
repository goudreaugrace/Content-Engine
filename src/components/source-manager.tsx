import { useState, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import { api, currentUser, type ProfileSource } from "../lib/api";

/**
 * NotebookLM-style source manager. Sits inside a profile editor
 * (sector / country / audience) and lets the admin attach reference
 * sources the agent will ground its drafts in.
 *
 * Three source kinds today:
 *   - url  : a web reference (title + url + optional snippet)
 *   - pdf  : an uploaded PDF/Word doc (title + snippet + server-stored blob)
 *   - note : hand-authored reference text (title + snippet only)
 *
 * The pdf upload flow is base64-in-JSON to avoid a multer dependency
 * server-side; capped at 10 MB by the shared express.json limit.
 */
export default function SourceManager({
  value,
  onChange,
}: {
  value: ProfileSource[] | undefined;
  onChange: (next: ProfileSource[]) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const list = value ?? [];

  const [adding, setAdding] = useState<null | "url" | "pdf" | "note">(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftSnippet, setDraftSnippet] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const me = currentUser();

  const resetDraft = () => {
    setDraftTitle("");
    setDraftUrl("");
    setDraftSnippet("");
    setError(null);
    setAdding(null);
  };

  const addSource = (s: ProfileSource) => {
    onChange([...list, s]);
    resetDraft();
  };

  const removeSource = (id: string) => {
    onChange(list.filter((s) => s.id !== id));
  };

  const saveUrl = () => {
    if (!draftTitle.trim() || !draftUrl.trim()) {
      setError("Title and URL are required.");
      return;
    }
    addSource({
      id: `src-${crypto.randomUUID().slice(0, 8)}`,
      kind: "url",
      title: draftTitle.trim(),
      url: draftUrl.trim(),
      snippet: draftSnippet.trim() || undefined,
      addedAt: new Date().toISOString(),
      addedBy: me.name,
    });
  };

  const saveNote = () => {
    if (!draftTitle.trim() || !draftSnippet.trim()) {
      setError("Title and note text are required.");
      return;
    }
    addSource({
      id: `src-${crypto.randomUUID().slice(0, 8)}`,
      kind: "note",
      title: draftTitle.trim(),
      snippet: draftSnippet.trim(),
      addedAt: new Date().toISOString(),
      addedBy: me.name,
    });
  };

  const handleFile = async (file: File) => {
    if (!draftTitle.trim()) {
      setError("Enter a title before choosing the file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large — 10 MB limit.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const uploaded = await api.uploadSourceFile({
        title: draftTitle.trim(),
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        dataUrl,
      });
      addSource({
        id: uploaded.id,
        kind: uploaded.kind,
        title: uploaded.title,
        fileName: uploaded.fileName,
        filePath: uploaded.filePath,
        snippet: draftSnippet.trim() || undefined,
        addedAt: new Date().toISOString(),
        addedBy: me.name,
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {/* Existing sources */}
      {list.length === 0 ? (
        <Typography
          sx={{ fontSize: "0.875rem", color: t.slate, fontStyle: "italic", mb: 2 }}
        >
          No sources yet — add URLs, upload PDFs, or paste reference notes the
          agent should ground its drafts in.
        </Typography>
      ) : (
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          {list.map((s) => (
            <SourceRow key={s.id} source={s} onRemove={() => removeSource(s.id)} />
          ))}
        </Stack>
      )}

      {/* Add-source affordances */}
      {adding === null && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
            onClick={() => setAdding("url")}
          >
            Add URL
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setAdding("pdf")}
          >
            Upload PDF
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<StickyNote2OutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setAdding("note")}
          >
            Add note
          </Button>
        </Stack>
      )}

      {adding !== null && (
        <Box
          sx={{
            border: `1px solid ${t.border}`,
            borderRadius: 1,
            p: 2,
            bgcolor: t.surface,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <KindIcon kind={adding} />
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              {adding === "url"
                ? "New URL source"
                : adding === "pdf"
                  ? "New PDF source"
                  : "New note source"}
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            <TextField
              label="Title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              size="small"
              fullWidth
              placeholder="e.g. Global Code of Conduct 2026"
            />
            {adding === "url" && (
              <TextField
                label="URL"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                size="small"
                fullWidth
                placeholder="https://…"
              />
            )}
            <TextField
              label={adding === "note" ? "Note text" : "Snippet (used by the agent)"}
              value={draftSnippet}
              onChange={(e) => setDraftSnippet(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={adding === "note" ? 4 : 2}
              placeholder={
                adding === "url"
                  ? "Optional. 1-2 sentences the agent should keep in mind when drafting."
                  : adding === "pdf"
                    ? "1-2 sentences summarizing the document. The agent grounds on this snippet."
                    : "Reference text the agent should treat as authoritative."
              }
              helperText={
                adding === "note"
                  ? undefined
                  : "This snippet is what the agent reads at draft time."
              }
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={resetDraft}>
                Cancel
              </Button>
              {adding === "url" && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={saveUrl}
                >
                  Add source
                </Button>
              )}
              {adding === "note" && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={saveNote}
                >
                  Add source
                </Button>
              )}
              {adding === "pdf" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf,.doc,.docx"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    disabled={uploading || !draftTitle.trim()}
                    startIcon={
                      uploading ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />
                      )
                    }
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? "Uploading…" : "Choose file"}
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function KindIcon({ kind }: { kind: ProfileSource["kind"] }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const sx = { fontSize: 16, color: t.slate };
  if (kind === "url") return <LinkIcon sx={sx} />;
  if (kind === "pdf") return <PictureAsPdfOutlinedIcon sx={sx} />;
  if (kind === "doc") return <DescriptionOutlinedIcon sx={sx} />;
  return <StickyNote2OutlinedIcon sx={sx} />;
}

function SourceRow({
  source,
  onRemove,
}: {
  source: ProfileSource;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const openHref =
    source.kind === "url"
      ? source.url
      : source.filePath
        ? `/api/uploads/${source.filePath.replace(/^source-uploads\//, "")}`
        : undefined;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 0.75,
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
      }}
    >
      <Box sx={{ pt: 0.25 }}>
        <KindIcon kind={source.kind} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography
            sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink }}
            noWrap
          >
            {source.title}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.6875rem",
              color: t.granite,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {source.kind}
          </Typography>
        </Stack>
        {source.snippet && (
          <Typography
            sx={{
              fontSize: "0.8125rem",
              color: t.slate,
              mt: 0.5,
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {source.snippet}
          </Typography>
        )}
        <Typography
          sx={{ fontSize: "0.6875rem", color: t.granite, mt: 0.75 }}
        >
          Added {new Date(source.addedAt).toLocaleDateString()} · {source.addedBy}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.25} alignItems="center">
        {openHref && (
          <IconButton
            size="small"
            component="a"
            href={openHref}
            target="_blank"
            rel="noopener"
            aria-label="Open source"
          >
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={onRemove}
          aria-label="Remove source"
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}


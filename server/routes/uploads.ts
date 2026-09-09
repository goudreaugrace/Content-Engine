import { Router } from "express";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/**
 * Sources / uploads router.
 *
 * Accepts a base64-encoded file (PDF or Word doc) as JSON so we don't
 * need to add multer/multipart plumbing for a POC. The request budget
 * is 10 MB (matches app-level `express.json` limit set in server/index.ts).
 *
 *   POST /api/uploads
 *     body: { title, fileName, mimeType, dataUrl }
 *          dataUrl: "data:application/pdf;base64,JVBER..."
 *     response: { id, filePath, fileName, kind, title, mimeType }
 *
 *   GET /api/uploads/:id/:fileName
 *     Streams the stored file back for the source-detail viewer.
 */
export const uploadsRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "source-uploads");
const execFileAsync = promisify(execFile);

async function ensureUploadDir(id: string) {
  const dir = path.join(UPLOAD_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function kindFromMime(mime: string): "pdf" | "doc" {
  if (mime === "application/pdf") return "pdf";
  return "doc";
}

function cleanDocxXml(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractUploadedText(filePath: string, mimeType: string) {
  try {
    if (mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "text/csv") {
      return (await fs.readFile(filePath, "utf8")).trim();
    }
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const { stdout } = await execFileAsync("unzip", ["-p", filePath, "word/document.xml"], {
        maxBuffer: 8 * 1024 * 1024,
      });
      return cleanDocxXml(stdout);
    }
  } catch {
    return "";
  }
  return "";
}

uploadsRouter.post("/", async (req, res) => {
  try {
    const { title, fileName, mimeType, dataUrl } = req.body as {
      title?: string;
      fileName?: string;
      mimeType?: string;
      dataUrl?: string;
    };
    if (!title || !fileName || !mimeType || !dataUrl) {
      return res
        .status(400)
        .json({ error: "title, fileName, mimeType, dataUrl required" });
    }
    if (!ALLOWED_MIME.has(mimeType)) {
      return res.status(400).json({ error: `mimeType ${mimeType} not allowed` });
    }
    // Strip the "data:<mime>;base64," prefix if present so we can decode
    // the raw payload directly.
    const b64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) {
      return res.status(400).json({ error: "empty file" });
    }

    const id = `src-${randomUUID().slice(0, 8)}`;
    const dir = await ensureUploadDir(id);
    const safeName = fileName.replace(/[^\w. -]/g, "_");
    const filePath = path.join(dir, safeName);
    await fs.writeFile(filePath, buf);

    // Server-relative path we persist on the profile — the GET route
    // below serves files from here.
    const publicPath = `source-uploads/${id}/${safeName}`;
    const extractedText = await extractUploadedText(filePath, mimeType);

    res.json({
      id,
      kind: kindFromMime(mimeType),
      title,
      fileName: safeName,
      filePath: publicPath,
      mimeType,
      extractedText,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "upload failed" });
  }
});

uploadsRouter.get("/:id/:fileName", async (req, res) => {
  const { id, fileName } = req.params;
  // Guard against traversal — only allow safe file segments.
  if (id.includes("/") || fileName.includes("/") || fileName.includes("..")) {
    return res.status(400).json({ error: "invalid path" });
  }
  const full = path.join(UPLOAD_DIR, id, fileName);
  try {
    await fs.access(full);
  } catch {
    return res.status(404).json({ error: "not found" });
  }
  res.sendFile(full);
});

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = 2;

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for journal encryption");
  return crypto.createHash("sha256").update(`flow-journal:${secret}`).digest();
}

export function encryptJournalContent(plainText: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: VERSION,
    alg: "AES-256-GCM",
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: encrypted.toString("base64url"),
  });
}

export function decryptJournalContent(payload: string) {
  const parsed = JSON.parse(payload) as { v?: number; iv?: string; tag?: string; data?: string };
  if (parsed.v !== VERSION || !parsed.iv || !parsed.tag || !parsed.data) {
    throw new Error("Unsupported journal ciphertext");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(parsed.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isServerEncryptedJournal(payload: string) {
  try {
    return JSON.parse(payload)?.v === VERSION;
  } catch {
    return false;
  }
}

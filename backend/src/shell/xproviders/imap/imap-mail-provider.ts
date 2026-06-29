import { connect } from "node:tls";

export interface ImapMail {
  source_id: string;
  source_label: string;
  raw_text: string;
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function decodeBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/=\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function header(raw: string, name: string): string | undefined {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+(?:\\n[ \\t].+)*)`, "im"));
  return match?.[1]?.replace(/\n[ \t]/g, " ").trim();
}

function parseFetchResponses(output: string): ImapMail[] {
  const result: ImapMail[] = [];
  const chunks = output.split(/\n\* \d+ FETCH /).slice(1);
  for (const chunk of chunks) {
    const uid = chunk.match(/UID (\d+)/i)?.[1];
    if (!uid) continue;
    const messageId = header(chunk, "Message-ID")?.replace(/[<>]/g, "");
    const from = header(chunk, "From");
    const subject = header(chunk, "Subject");
    const sourceId = messageId || `uid:${uid}`;
    const label = [from, subject].filter(Boolean).join(" - ") || `E-Mail ${uid}`;
    result.push({
      source_id: sourceId,
      source_label: label,
      raw_text: decodeBody(chunk),
    });
  }
  return result;
}

export class ImapMailProvider {
  constructor(
    private readonly config = {
      host: process.env.EMAIL_INGEST_IMAP_SERVER,
      port: Number(process.env.EMAIL_INGEST_IMAP_PORT ?? 993),
      user: process.env.EMAIL_INGEST_IMAP_USER,
      password: process.env.EMAIL_INGEST_IMAP_PASSWORD,
    },
  ) {}

  async fetchUnseen(): Promise<ImapMail[]> {
    const { host, port, user, password } = this.config;
    if (!host || !user || !password) {
      throw new Error("IMAP-Zugang ist nicht vollständig konfiguriert.");
    }

    return await new Promise((resolve, reject) => {
      const socket = connect({ host, port, servername: host });
      let buffer = "";
      let tag = 0;
      const write = (command: string) => {
        tag += 1;
        const id = `a${tag}`;
        socket.write(`${id} ${command}\r\n`);
        return id;
      };
      const waitFor = (id: string) =>
        new Promise<string>((done, fail) => {
          const startedAt = Date.now();
          const timer = setInterval(() => {
            if (buffer.includes(`${id} OK`) || buffer.includes(`${id} NO`) || buffer.includes(`${id} BAD`)) {
              clearInterval(timer);
              done(buffer);
            } else if (Date.now() - startedAt > 20000) {
              clearInterval(timer);
              fail(new Error("IMAP-Antwort hat zu lange gedauert."));
            }
          }, 50);
        });

      socket.setEncoding("utf8");
      socket.on("data", (chunk) => {
        buffer += chunk;
      });
      socket.on("error", reject);
      socket.on("secureConnect", async () => {
        try {
          await waitFor("*");
          buffer = "";
          await waitFor(write(`LOGIN ${quote(user)} ${quote(password)}`));
          buffer = "";
          await waitFor(write("SELECT INBOX"));
          buffer = "";
          const search = await waitFor(write("UID SEARCH UNSEEN"));
          const uids = search.match(/\* SEARCH ([\d\s]+)/)?.[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
          if (uids.length === 0) {
            socket.end();
            resolve([]);
            return;
          }

          buffer = "";
          const fetch = await waitFor(write(`UID FETCH ${uids.join(",")} (UID BODY.PEEK[])`));
          const mails = parseFetchResponses(fetch);
          for (const uid of uids) {
            buffer = "";
            await waitFor(write(`UID STORE ${uid} +FLAGS (\\Seen)`));
          }
          socket.end();
          resolve(mails);
        } catch (cause) {
          socket.destroy();
          reject(cause);
        }
      });
    });
  }
}

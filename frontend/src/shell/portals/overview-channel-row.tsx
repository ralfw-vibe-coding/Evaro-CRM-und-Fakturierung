import { Copy, Globe, Mail, Phone, SquareArrowOutUpRight } from "lucide-react";
import type { Channel } from "@/domain/model";

function iconFor(type: string) {
  if (type === "email") return <Mail className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />;
  if (type === "phone") return <Phone className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />;
  if (type === "website") return <Globe className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />;
  return null;
}

function openTarget(type: string, value: string): string | null {
  if (type === "email") return `mailto:${value}`;
  if (type === "website") return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return null;
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function OverviewChannelRow({ channel }: { channel: Channel }) {
  const target = openTarget(channel.type, channel.address);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {iconFor(channel.type)}
      <span className="min-w-0 flex-1 truncate">{channel.address}</span>
      <button
        type="button"
        className="grid size-6 shrink-0 place-items-center rounded text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        title="In die Zwischenablage kopieren"
        aria-label="In die Zwischenablage kopieren"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void copyText(channel.address);
        }}
      >
        <Copy className="size-3.5" />
      </button>
      {target && (
        <a
          href={target}
          target={channel.type === "website" ? "_blank" : undefined}
          rel={channel.type === "website" ? "noreferrer" : undefined}
          className="grid size-6 shrink-0 place-items-center rounded text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          title={channel.type === "email" ? "E-Mail schreiben" : "Website öffnen"}
          aria-label={channel.type === "email" ? "E-Mail schreiben" : "Website öffnen"}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <SquareArrowOutUpRight className="size-3.5" />
        </a>
      )}
    </div>
  );
}

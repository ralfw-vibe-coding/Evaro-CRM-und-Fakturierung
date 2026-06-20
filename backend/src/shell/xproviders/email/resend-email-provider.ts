export interface OtpEmail {
  to: string;
  code: string;
  expiresInMinutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function otpEmailHtml(code: string, expiresInMinutes: number): string {
  const safeCode = escapeHtml(code);
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dein Evaro Login-Code</title>
  </head>
  <body style="margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e8ef;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 12px;">
                <div style="font-size:18px;font-weight:700;color:#f60b8a;letter-spacing:.2px;">Evaro</div>
                <h1 style="margin:24px 0 8px;font-size:24px;line-height:1.25;color:#111827;">Dein Login-Code</h1>
                <p style="margin:0;color:#5f6472;font-size:15px;line-height:1.6;">Gib diesen Code ein, um dich bei Evaro anzumelden.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;">
                <div style="background:#f7f7fa;border:1px solid #ebecef;border-radius:12px;padding:18px;text-align:center;">
                  <div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:8px;color:#111827;">${safeCode}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;color:#5f6472;font-size:14px;line-height:1.6;">Der Code ist ${expiresInMinutes} Minuten gültig. Wenn du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#8a90a0;font-size:12px;">Diese Nachricht wurde automatisch gesendet.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export class ResendEmailProvider {
  constructor(
    private readonly apiKey = process.env.RESEND_API_KEY ?? "",
    private readonly from = process.env.AUTH_FROM_EMAIL ?? "",
  ) {}

  async sendOtpEmail(email: OtpEmail): Promise<void> {
    if (!this.apiKey) throw new Error("RESEND_API_KEY ist nicht konfiguriert.");
    if (!this.from) throw new Error("AUTH_FROM_EMAIL ist nicht konfiguriert.");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [email.to],
        subject: "Dein Evaro Login-Code",
        html: otpEmailHtml(email.code, email.expiresInMinutes),
        text: `Dein Evaro Login-Code: ${email.code}\n\nDer Code ist ${email.expiresInMinutes} Minuten gültig.`,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend konnte die E-Mail nicht senden (${response.status}). ${body}`);
    }
  }
}

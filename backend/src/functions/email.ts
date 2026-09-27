import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_SES_REGION || 'ap-southeast-2';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@unswengsoc.com';

/* Lazily constructed so a missing/unconfigured SES setup doesn't crash the
   whole backend on import — only matters the moment something actually
   tries to send. Uses its own explicit credentials (not the default
   provider chain) since this runs on Vercel, not on AWS compute — there's
   no IAM role to fall back to. */
function getSesClient(): SESClient | null {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  return new SESClient({
    region: AWS_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Sends one HTML email via SES. Best-effort by design — every caller in
 * this app treats a failed email exactly like a failed Google Calendar
 * sync or push notification: logged, never thrown, never blocks whatever
 * real thing (a task getting assigned, an announcement getting posted)
 * triggered it. Silently no-ops if SES isn't configured yet (no access
 * key/secret set) rather than erroring on every notification in the
 * meantime.
 */
export async function sendEmail(to: string, subject: string, bodyHtml: string): Promise<void> {
  const client = getSesClient();
  if (!client) {
    console.warn('SES not configured (AWS_SES_ACCESS_KEY_ID/AWS_SES_SECRET_ACCESS_KEY missing) — skipping email:', subject);
    return;
  }

  try {
    await client.send(
      new SendEmailCommand({
        Source: SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: bodyHtml, Charset: 'UTF-8' } },
        },
      })
    );
  } catch (error) {
    console.error('SES send error:', error);
  }
}

/* Brand shell around a notification's own title/message — the same two
   fields already shown in-app (see functions/notifications.ts), so no
   separate copywriting is needed per notification type. No embedded
   logo/social-icon images (cid: attachments) yet — swap the header/footer
   blocks below for real <img> tags once those assets exist; everything
   else (colours, fonts, layout, sign-off) matches the club's existing
   branded email template. */
export function renderNotificationEmail(recipientName: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;">
          <tr>
            <td style="padding:30px 30px 10px;text-align:center;">
              <span style="font-size:20px;font-weight:700;letter-spacing:1px;color:#264653;">UNSW ENGINEERING SOCIETY</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px 0;">
              <p style="margin:0;font-size:16px;line-height:140%;color:#264653;"><strong>Dear ${escapeHtml(recipientName)},</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px;font-size:14px;line-height:160%;color:#000000;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px 30px;">
              <p style="margin:0;font-size:14px;line-height:140%;color:#264653;"><strong>Best regards,</strong></p>
              <p style="margin:0;font-size:14px;line-height:140%;color:#264653;">UNSW Engineering Society</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#324158;padding:24px 10px;text-align:center;">
              <span style="font-size:14px;color:#ecf0f1;letter-spacing:1px;">WWW.UNSWENGSOC.COM</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

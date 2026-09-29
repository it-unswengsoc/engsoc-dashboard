import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer, { type Transporter } from 'nodemailer';
import { EMAIL_IMAGES } from '../assets/emailImages';

const AWS_REGION = process.env.AWS_SES_REGION || 'ap-southeast-2';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@unswengsoc.com';

/* Lazily constructed so a missing/unconfigured SES setup doesn't crash the
   whole backend on import — only matters the moment something actually
   tries to send. Uses its own explicit credentials (not the default
   provider chain) since this runs on Vercel, not on AWS compute — there's
   no IAM role to fall back to.
   nodemailer (not the plain SES SDK) because inline images need a real MIME
   multipart/related message — the plain SendEmailCommand API has no
   attachment support at all, only SendRawEmailCommand with a hand-built
   MIME payload, which nodemailer builds for us from a plain `attachments`
   list instead. */
function getTransport(): Transporter | null {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  const sesClient = new SESv2Client({ region: AWS_REGION, credentials: { accessKeyId, secretAccessKey } });
  return nodemailer.createTransport({ SES: { sesClient, SendEmailCommand } });
}

/* The same 5 images the club's own Google Apps Script bulk-email tool
   embeds (engsocLogo, facebookLogo, instagramLogo, linkedInLogo,
   youtubeLogo — see src/assets/emailImages.ts) — referenced in the
   template below as src="cid:<name>", exactly like that script's
   inlineImages option. */
const emailAttachments = EMAIL_IMAGES.map((img) => ({
  filename: img.filename,
  content: Buffer.from(img.base64, 'base64'),
  contentType: img.contentType,
  cid: img.cid,
}));

/**
 * Sends one HTML email via SES (through nodemailer, for inline-image
 * support). Best-effort by design — every caller in this app treats a
 * failed email exactly like a failed Google Calendar sync or push
 * notification: logged, never thrown, never blocks whatever real thing (a
 * task getting assigned, an announcement getting posted) triggered it.
 * Silently no-ops if SES isn't configured yet (no access key/secret set)
 * rather than erroring on every notification in the meantime.
 */
export async function sendEmail(to: string, subject: string, bodyHtml: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.warn('SES not configured (AWS_SES_ACCESS_KEY_ID/AWS_SES_SECRET_ACCESS_KEY missing) — skipping email:', subject);
    return;
  }

  try {
    await transport.sendMail({
      from: `"UNSW Engineering Society" <${SES_FROM_EMAIL}>`,
      to,
      subject,
      html: bodyHtml,
      attachments: emailAttachments,
    });
  } catch (error) {
    console.error('SES send error:', error);
  }
}

/* Brand shell around a notification's own title/message — the same two
   fields already shown in-app (see functions/notifications.ts), so no
   separate copywriting is needed per notification type. Structure/colours/
   images match the club's existing branded email template (the one used by
   its Apps Script bulk-email tool) — logo + social icons are the same
   images, referenced the same way (src="cid:..."). */
export function renderNotificationEmail(recipientName: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    /* Apple Mail/iOS auto-linkify plaintext that looks like a URL (e.g. the
       WWW.UNSWENGSOC.COM footer line) and slap their own blue/underlined
       default styling on it — this overrides that back to matching text. */
    a[x-apple-data-detectors='true'] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;">
          <tr>
            <td style="padding:30px 30px 10px;text-align:center;">
              <img src="cid:engsocLogo" alt="UNSW Engineering Society" width="166" style="display:inline-block;border:none;height:auto;max-width:166px;width:36%;">
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
            <td style="background-color:#324158;padding:30px 10px 10px;text-align:center;">
              <a href="https://www.unswengsoc.com" style="font-size:14px;color:#ecf0f1 !important;letter-spacing:1px;text-decoration:none;">WWW.UNSWENGSOC.COM</a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#324158;padding:10px 10px 30px;text-align:center;">
              <a href="https://www.facebook.com/UNSWEngSoc" style="display:inline-block;margin:0 5px;"><img src="cid:facebookLogo" alt="Facebook" width="32" style="display:block;border:none;"></a>
              <a href="https://www.instagram.com/unswengsoc/" style="display:inline-block;margin:0 5px;"><img src="cid:instagramLogo" alt="Instagram" width="32" style="display:block;border:none;"></a>
              <a href="https://www.linkedin.com/company/unsw-engineering-society" style="display:inline-block;margin:0 5px;"><img src="cid:linkedInLogo" alt="LinkedIn" width="32" style="display:block;border:none;"></a>
              <a href="https://www.youtube.com/channel/UCjsJfEq4qIQXBf59w1zdYhQ" style="display:inline-block;margin:0 5px;"><img src="cid:youtubeLogo" alt="YouTube" width="32" style="display:block;border:none;"></a>
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

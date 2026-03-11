/**
 * Email templates for transactional emails.
 * Full HTML structure + plain text alternatives to avoid spam filters.
 */

const layout = (content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Loomknot</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:480px;width:100%">
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #e4e4e7">
              <span style="font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.02em">Loomknot</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #e4e4e7;text-align:center">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa">
                Loomknot — collaborative planning platform<br>
                You received this email because of your account activity on loomknot.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function magicLinkEmail(pin: string) {
  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b">Your sign-in code</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#52525b">Enter this code to sign in to your Loomknot account.</p>
    <div style="background-color:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px">
      <span style="font-size:32px;font-weight:700;letter-spacing:0.15em;color:#18181b">${pin}</span>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  `);

  const text = [
    'Your Loomknot sign-in code',
    '',
    `Code: ${pin}`,
    '',
    'This code expires in 10 minutes.',
    'If you didn\'t request this, you can safely ignore this email.',
    '',
    '— Loomknot',
  ].join('\n');

  return { html, text };
}

export function inviteEmail(acceptUrl: string, projectTitle: string) {
  const safeTitle = projectTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b">You're invited to collaborate</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#52525b">
      You've been invited to join the project <strong style="color:#18181b">${safeTitle}</strong> on Loomknot.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td align="center">
          <a href="${acceptUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:12px 32px;border-radius:6px">
            Accept invitation
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#a1a1aa">This invitation expires in 7 days.</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa">If you don't recognize this project, you can safely ignore this email.</p>
  `);

  const text = [
    `You're invited to join "${projectTitle}" on Loomknot`,
    '',
    'Accept the invitation by visiting:',
    acceptUrl,
    '',
    'This invitation expires in 7 days.',
    'If you don\'t recognize this project, you can safely ignore this email.',
    '',
    '— Loomknot',
  ].join('\n');

  return { html, text };
}

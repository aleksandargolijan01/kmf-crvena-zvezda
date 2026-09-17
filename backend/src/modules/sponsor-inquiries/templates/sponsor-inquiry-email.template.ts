import { SanitizedSponsorInquiry } from '../utils/sponsor-inquiry-sanitizer';

export interface SponsorInquiryEmailTemplateData {
  inquiry: SanitizedSponsorInquiry;
  submittedAt: Date;
  replyToEnabled: boolean;
}

export function buildSponsorInquiryEmail(data: SponsorInquiryEmailTemplateData) {
  const inquiry = data.inquiry;
  const submittedAt = new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Belgrade',
  }).format(data.submittedAt);
  const replyHref = `mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(`Re: Нови упит за партнерство — ${inquiry.companyName}`)}`;
  const rows = [
    ['Име и презиме', inquiry.fullName],
    ['Компанија', inquiry.companyName],
    ['Email', inquiry.email],
    ['Телефон', inquiry.phone || 'Није наведено'],
    ['Пакет интересовања', inquiry.sponsorshipPackage || 'Није наведено'],
    ['Порука', inquiry.message],
    ['Датум слања', submittedAt],
  ];

  return `<!doctype html>
<html lang="sr-Cyrl">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Нови упит за партнерство</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f6;font-family:Arial,Helvetica,sans-serif;color:#202024;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background-color:#f4f4f6;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="width:100%;max-width:640px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e3e3e7;">
            <tr>
              <td style="background-color:#8a000b;background-image:linear-gradient(135deg,#d50012,#700007 58%,#220003);padding:28px 26px;text-align:center;">
                <img src="cid:club-logo" width="86" alt="КМФ Црвена звезда" style="display:block;margin:0 auto 16px auto;width:86px;height:auto;border:0;outline:none;text-decoration:none;" />
                <div style="font-size:12px;line-height:18px;color:#ffffff;text-transform:uppercase;font-weight:700;">КМФ Црвена звезда</div>
                <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:28px;line-height:34px;font-weight:900;">Нови упит за партнерство</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 26px 12px 26px;">
                <p style="margin:0;color:#3b3b42;font-size:16px;line-height:24px;">
                  Преко јавног сајта стигао је нови упит за партнерство са клубом. Подаци су приказани у наставку.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 26px 24px 26px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border:1px solid #ededf0;border-radius:8px;border-collapse:separate;overflow:hidden;">
                  ${rows.map(([label, value], index) => renderRow(label, value, index === rows.length - 1)).join('')}
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 26px 30px 26px;">
                <a href="${replyHref}" style="display:inline-block;background-color:#d50012;color:#ffffff;text-decoration:none;border-radius:6px;padding:13px 22px;font-size:14px;line-height:18px;font-weight:800;text-transform:uppercase;">
                  Одговори на email
                </a>
                ${data.replyToEnabled ? '<p style="margin:12px 0 0 0;color:#6a6a72;font-size:12px;line-height:18px;">Reply-To је подешен на email пошиљаоца.</p>' : ''}
              </td>
            </tr>
            <tr>
              <td style="background-color:#18181b;padding:18px 26px;text-align:center;">
                <p style="margin:0;color:#c9c9d0;font-size:12px;line-height:18px;">
                  Ова порука је послата преко сајта КМФ Црвена звезда. Не одговарајте на системску адресу ако Reply-To није доступан.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderRow(label: string, value: string, isLast: boolean) {
  const border = isLast ? '' : 'border-bottom:1px solid #ededf0;';
  const formattedValue = escapeHtml(value).replace(/\n/g, '<br />');

  return `<tr>
    <td style="width:34%;${border}padding:14px 16px;background-color:#fafafa;color:#7a1a22;font-size:12px;line-height:18px;font-weight:800;text-transform:uppercase;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="${border}padding:14px 16px;background-color:#ffffff;color:#202024;font-size:15px;line-height:22px;vertical-align:top;">${formattedValue}</td>
  </tr>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

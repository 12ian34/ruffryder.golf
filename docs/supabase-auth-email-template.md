# Supabase Auth Email Template

Use this for the Supabase Auth magic-link email template.

Dashboard path:

`Supabase Dashboard -> Authentication -> Email Templates -> Magic Link`

Recommended subject:

```text
Ruff Ryders Cup access link
```

Recommended body:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#050505;color:#e6edf3;font-family:Menlo,Consolas,monospace;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #27272a;background:#09090b;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;color:#3fb950;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                  Ruff Ryders Cup
                </p>
                <h1 style="margin:0;color:#fafafa;font-size:28px;line-height:1;letter-spacing:-1px;text-transform:uppercase;">
                  Your 2026 console link
                </h1>
                <p style="margin:18px 0 0;color:#a1a1aa;font-size:14px;line-height:1.7;">
                  You requested access to the match-day scoring console. Hit the button below and get back to the card.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="background:#3fb950;border-radius:6px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 18px;color:#09090b;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;">
                        Enter the cup
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#8b949e;font-size:12px;line-height:1.7;">
                  This link is single-use. If it expires, request a fresh one from the login screen.
                </p>
                <p style="margin:18px 0 0;color:#484f58;font-size:11px;line-height:1.6;">
                  If the button fails, copy this URL into your browser:<br />
                  <span style="word-break:break-all;color:#8b949e;">{{ .ConfirmationURL }}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

Notes:

- Keep the `{{ .ConfirmationURL }}` placeholder intact.
- Supabase owns delivery and link generation; this repo only stores the desired template copy/design.
- If Supabase adds template config to the CLI project later, move this HTML into the managed config path.

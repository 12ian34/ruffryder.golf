# Supabase Auth Email Templates

Supabase owns the hosted auth emails. Keep the Confirm Signup and Magic Link templates aligned so first-time and returning users get the same Ruff Ryders Cup 2026 experience.

Recommended sender name:

```text
Ruff Ryders Cup 2026
```

Recommended from/reply-to:

```text
Ian <i@ianahuja.com>
```

## Confirm Signup

Dashboard path:

`Supabase Dashboard -> Authentication -> Email Templates -> Confirm Signup`

Recommended subject:

```text
Confirm your Ruff Ryders Cup 2026 access
```

Recommended body:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#050506;color:#e6edf3;font-family:Menlo,Consolas,monospace;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #27272a;background:#09090b;">
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;color:#3fb950;font-size:12px;letter-spacing:0.08em;font-weight:700;">
                  Ruff Ryders Cup 2026
                </p>
                <h1 style="margin:0;color:#fafafa;font-size:24px;line-height:1.2;letter-spacing:-0.04em;">
                  Confirm your email
                </h1>
                <p style="margin:18px 0 0;color:#e6edf3;font-size:14px;line-height:1.7;">
                  Hi, here is the confirmation link for Ruff Ryders Cup 2026.
                </p>
                <p style="margin:12px 0 0;color:#a1a1aa;font-size:14px;line-height:1.7;">
                  You are getting this because this email address was entered at ruffryder.golf to open the tournament scoring app.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="background:#3fb950;border-radius:6px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 18px;color:#09090b;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.06em;">
                        Confirm and open the app
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#8b949e;font-size:12px;line-height:1.7;">
                  The link can only be used once. If you did not request it, you can ignore this email.
                </p>
                <p style="margin:18px 0 0;color:#6b7280;font-size:11px;line-height:1.6;">
                  If the button does not work, copy this URL into your browser:<br />
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

## Magic Link

Dashboard path:

`Supabase Dashboard -> Authentication -> Email Templates -> Magic Link`

Recommended subject:

```text
Your Ruff Ryders Cup 2026 sign-in link
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
                <p style="margin:0 0 12px;color:#3fb950;font-size:12px;letter-spacing:0.08em;font-weight:700;">
                  Ruff Ryders Cup 2026
                </p>
                <h1 style="margin:0;color:#fafafa;font-size:24px;line-height:1.2;letter-spacing:-0.04em;">
                  Sign in to the cup
                </h1>
                <p style="margin:18px 0 0;color:#e6edf3;font-size:14px;line-height:1.7;">
                  Hi, here is your sign-in link for Ruff Ryders Cup 2026.
                </p>
                <p style="margin:12px 0 0;color:#a1a1aa;font-size:14px;line-height:1.7;">
                  You are getting this because this email address was entered at ruffryder.golf to open the tournament scoring app.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="background:#3fb950;border-radius:6px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 18px;color:#09090b;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.06em;">
                        Open Ruff Ryders Cup 2026
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#8b949e;font-size:12px;line-height:1.7;">
                  The link can only be used once. If you did not request it, you can ignore this email.
                </p>
                <p style="margin:18px 0 0;color:#6b7280;font-size:11px;line-height:1.6;">
                  If the button does not work, copy this URL into your browser:<br />
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
- The email should name the product as `Ruff Ryders Cup 2026` and explain that the message came from someone entering the address at `ruffryder.golf`.
- If Supabase adds template config to the CLI project later, move this HTML into the managed config path.

package common

import (
	"html"
	"strings"
)

// EmailTemplateOptions describes the content of a transactional email.
//
// Body is trusted HTML: callers either build it themselves or pass through the
// notification body stored by an administrator. Title, Intro and Note are
// escaped so a stray angle bracket cannot break the layout.
type EmailTemplateOptions struct {
	Title   string
	Intro   string
	Body    string
	Note    string
	SiteURL string
}

// BuildEmailHTML wraps content in the shared branded card used by every
// notification email: verification codes, password resets, email binding,
// account security notices, announcements and balance reminders.
func BuildEmailHTML(opts EmailTemplateOptions) string {
	siteURL := strings.TrimSpace(opts.SiteURL)
	siteLabel := strings.TrimPrefix(strings.TrimPrefix(siteURL, "https://"), "http://")
	support := strings.TrimSpace(SMTPFrom)

	var builder strings.Builder
	builder.WriteString(`<div style="background:#f6f7f9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">`)
	builder.WriteString(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">`)
	builder.WriteString(`<tr><td style="padding:24px 28px 6px;">`)
	builder.WriteString(`<div style="font-size:16px;font-weight:600;color:#111827;">` + html.EscapeString(SystemName) + `</div>`)
	builder.WriteString(`<div style="font-size:12px;color:#6b7280;margin-top:2px;">AI 大模型 API 聚合平台</div>`)
	builder.WriteString(`</td></tr>`)
	builder.WriteString(`<tr><td style="padding:10px 28px 0;">`)

	if strings.TrimSpace(opts.Title) != "" {
		builder.WriteString(`<div style="font-size:18px;font-weight:600;color:#111827;margin:0 0 12px;">` + html.EscapeString(opts.Title) + `</div>`)
	}
	if strings.TrimSpace(opts.Intro) != "" {
		builder.WriteString(`<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">` + html.EscapeString(opts.Intro) + `</p>`)
	}
	builder.WriteString(opts.Body)
	if strings.TrimSpace(opts.Note) != "" {
		builder.WriteString(`<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">` + html.EscapeString(opts.Note) + `</p>`)
	}

	builder.WriteString(`</td></tr>`)
	builder.WriteString(`<tr><td style="padding:20px 28px 24px;">`)
	builder.WriteString(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 12px;">`)
	if siteURL != "" {
		builder.WriteString(`<p style="margin:0;font-size:12px;color:#9ca3af;">` + html.EscapeString(SystemName) + ` · <a href="` + html.EscapeString(siteURL) + `" style="color:#6b7280;text-decoration:none;">` + html.EscapeString(siteLabel) + `</a></p>`)
	} else {
		builder.WriteString(`<p style="margin:0;font-size:12px;color:#9ca3af;">` + html.EscapeString(SystemName) + `</p>`)
	}
	if support != "" {
		builder.WriteString(`<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">客服邮箱：` + html.EscapeString(support) + `</p>`)
	}
	builder.WriteString(`</td></tr>`)
	builder.WriteString(`</table>`)
	builder.WriteString(`</div>`)
	return builder.String()
}

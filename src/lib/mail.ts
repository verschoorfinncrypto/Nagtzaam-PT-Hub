import "server-only";
import nodemailer from "nodemailer";
import { headers } from "next/headers";

/** SMTP via de eigen mailbox van de praktijk. Zonder SMTP_HOST verstuurt de hub niets en toont hij de link om te kopiëren. */
export function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Basis-URL voor links in mails: APP_URL, anders het adres waarop de hub nu bereikt wordt. */
export function appUrl() {
  const env = process.env.APP_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Eenvoudige mail in de huisstijl: koptekst, alinea's, één grote knop. */
export function layout({ title, paragraphs, button, footer }: { title: string; paragraphs: string[]; button: { label: string; href: string }; footer: string }) {
  const base = appUrl();
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;color:#101936">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#101936;padding:20px 28px"><img src="${base}/brand/logo-white.png" alt="Fysiotherapie Nagtzaam" width="170" style="display:block;border:0"></td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 14px">${esc(p)}</p>`).join("")}
<p style="margin:24px 0"><a href="${button.href}" style="display:inline-block;background:#101936;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 22px;border-radius:999px">${esc(button.label)}</a></p>
<p style="font-size:13px;line-height:1.5;color:#5b6178;margin:0">Werkt de knop niet? Kopieer deze link in je browser:<br><span style="word-break:break-all">${esc(button.href)}</span></p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e4e7f0;font-size:12px;color:#5b6178">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, "", `${button.label}: ${button.href}`, "", footer].join("\n");
  return { html, text };
}

export async function sendMail(to: string, subject: string, body: { html: string; text: string }) {
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER!;
  await getTransport().sendMail({ from, to, subject, html: body.html, text: body.text });
}

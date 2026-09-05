/**
 * Cloudflare Pages Function — POST /api/lead
 *
 * Receives the booking form and fans it out to whichever destinations are
 * configured as environment variables in the Pages project. Every destination
 * is optional; if none are set the lead is still logged and accepted, so the
 * form never appears broken to a patient.
 *
 *   LEAD_WEBHOOK    — any URL that accepts JSON (Google Apps Script, Zapier,
 *                     Make, n8n). Easiest route to a Google Sheet.
 *   RESEND_API_KEY  — send an email notification via Resend.
 *   LEAD_TO_EMAIL   — where that email goes (comma-separated for several).
 *   LEAD_FROM_EMAIL — verified sender on your Resend domain.
 *   TURNSTILE_SECRET— optional Cloudflare Turnstile validation.
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'Malformed request' }, 400);
  }

  // Honeypot — pretend everything is fine, then drop it.
  if (data.company) return json({ ok: true });

  const name = String(data.name ?? '').trim();
  const phoneDigits = String(data.phone ?? '').replace(/\D/g, '').replace(/^(91|0)/, '');
  const service = String(data.service ?? '').trim();

  if (name.length < 2 || !/^[6-9]\d{9}$/.test(phoneDigits) || !service) {
    return json({ ok: false, error: 'Please check your name, mobile number and selected treatment.' }, 422);
  }

  const lead = {
    name,
    phone: `+91${phoneDigits}`,
    service,
    preferred: String(data.preferred ?? '').trim(),
    message: String(data.message ?? '').trim().slice(0, 1200),
    variant: String(data.variant ?? 'generic'),
    page: String(data.page ?? '/'),
    receivedAt: new Date().toISOString(),
    // Useful for spotting spam bursts; not shown to anyone.
    country: request.headers.get('CF-IPCountry') ?? '',
    userAgent: request.headers.get('User-Agent')?.slice(0, 200) ?? '',
  };

  const tasks = [];

  if (env.LEAD_WEBHOOK) {
    tasks.push(
      fetch(env.LEAD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }),
    );
  }

  if (env.RESEND_API_KEY && env.LEAD_TO_EMAIL) {
    const waLink = `https://wa.me/${lead.phone.replace('+', '')}`;
    tasks.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.LEAD_FROM_EMAIL || 'Clinic Website <onboarding@resend.dev>',
          to: env.LEAD_TO_EMAIL.split(',').map((s) => s.trim()),
          reply_to: undefined,
          subject: `New enquiry — ${esc(service)} — ${esc(name)}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px">
              <h2 style="margin:0 0 4px">New consultation request</h2>
              <p style="color:#666;margin:0 0 20px">Chitra's Lifeline Clinic · landing page</p>
              <table style="width:100%;border-collapse:collapse;font-size:15px">
                <tr><td style="padding:8px 0;color:#666;width:130px">Name</td><td><strong>${esc(name)}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#666">Mobile</td><td><a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a> · <a href="${waLink}">WhatsApp</a></td></tr>
                <tr><td style="padding:8px 0;color:#666">Treatment</td><td>${esc(service)}</td></tr>
                <tr><td style="padding:8px 0;color:#666">Best time</td><td>${esc(lead.preferred)}</td></tr>
                <tr><td style="padding:8px 0;color:#666">Ad group</td><td>${esc(lead.variant)}</td></tr>
                ${lead.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td>${esc(lead.message)}</td></tr>` : ''}
              </table>
            </div>`,
        }),
      }),
    );
  }

  // Fan out, but never fail the patient's submission because a downstream
  // service is down — we already have the lead in the logs.
  if (tasks.length) {
    const results = await Promise.allSettled(tasks);
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`lead sink ${i} failed:`, r.reason);
      else if (!r.value.ok) console.error(`lead sink ${i} returned ${r.value.status}`);
    });
  } else {
    console.log('LEAD (no sinks configured):', JSON.stringify(lead));
  }

  return json({ ok: true });
}

export const onRequestGet = () => json({ ok: false, error: 'Method not allowed' }, 405);

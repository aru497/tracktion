// Tracktion — price-alert checker (Supabase Edge Function, Deno)
// Schedule it (see supabase/README.md) to run e.g. hourly.
// For every open alert it compares the part's current lowest offer price to the
// user's target; if hit, it marks the alert triggered and emails the user via
// Resend. Offers are refreshed by crawler/crawl.mjs (or a separate cron).
//
// Env required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-injected in Supabase)
//   RESEND_API_KEY                            (optional — skips email if unset)
//   ALERT_FROM_EMAIL                          (e.g. "Tracktion <alerts@yourdomain>")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("ALERT_FROM_EMAIL") ?? "Tracktion <onboarding@resend.dev>";

async function lowestPrice(partId: string): Promise<number | null> {
  const { data } = await supabase
    .from("offers")
    .select("price, club_price")
    .eq("part_id", partId);
  if (!data || !data.length) return null;
  return Math.min(...data.map((o) => Number(o.club_price ?? o.price)));
}

async function email(to: string, partName: string, price: number, target: number) {
  if (!RESEND_KEY || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `Price drop: ${partName} is now $${price.toFixed(2)}`,
      html:
        `<h2 style="font-family:sans-serif">Your watched part just dropped</h2>
         <p style="font-family:sans-serif"><b>${partName}</b> is now <b>$${price.toFixed(2)}</b> — at or below your $${target.toFixed(2)} target.</p>
         <p style="font-family:sans-serif">Open Tracktion to grab it.</p>`,
    }),
  });
}

Deno.serve(async () => {
  // pull open alerts + the owner's email + the part name
  const { data: alerts, error } = await supabase
    .from("price_alerts")
    .select("id, part_id, target, user_id, profiles(email), parts(name)")
    .eq("triggered", false);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let triggered = 0;
  for (const a of alerts ?? []) {
    const price = await lowestPrice(a.part_id);
    if (price === null || price > Number(a.target)) continue;
    await supabase.from("price_alerts")
      .update({ triggered: true, triggered_at: new Date().toISOString(), notified: !!RESEND_KEY })
      .eq("id", a.id);
    // deno-lint-ignore no-explicit-any
    const to = (a as any).profiles?.email as string | undefined;
    // deno-lint-ignore no-explicit-any
    const name = (a as any).parts?.name ?? "your part";
    await email(to ?? "", name, price, Number(a.target));
    triggered++;
  }

  return new Response(JSON.stringify({ checked: alerts?.length ?? 0, triggered }), {
    headers: { "Content-Type": "application/json" },
  });
});

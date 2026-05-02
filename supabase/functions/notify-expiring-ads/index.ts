import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

serve(async () => {
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("Missing RESEND_API_KEY");

    const resend = new Resend(resendKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const next3DaysStr = new Date(Date.now() + 3 * 86400000)
      .toISOString()
      .slice(0, 10);

    const { data: ads, error } = await supabase
      .from("ad_tracking_records")
      .select("id, customer_name, end_date")
      .not("end_date", "is", null)
      .gte("end_date", todayStr)
      .lte("end_date", next3DaysStr);

    if (error) throw error;

    if (!ads || ads.length === 0) {
      return new Response("No expiring ads");
    }

    const dashboardUrl = "https://bd-tracker-pinkfan.vercel.app/";

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>The following campaigns will expire within the next 3 days:</p>

        <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Customer</th>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">End Date</th>
            </tr>
          </thead>
          <tbody>
            ${ads
              .map(
                (ad) => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                      ${ad.customer_name}
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                      ${ad.end_date}
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>

      <p style="margin-top:16px;">
        Please review and take action if needed.
      </p>

      <table style="width:100%; margin-top:20px;">
        <tr>
          <td align="left">
            <a 
              href="${dashboardUrl}" 
              style="
                display: inline-block;
                padding: 10px 16px;
                background-color: #2563eb;
                color: #ffffff;
                text-decoration: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
              "
            >
              View in Dashboard
            </a>
          </td>
        </tr>
      </table>

    </div>
    `;

    const { error: mailError } = await resend.emails.send({
      from: "Ads Tracker <onboarding@resend.dev>",
      to: ["phantamnhu7867@gmail.com"],
      subject: "Ads Expiring Soon Pink Fan oii",
      html,
    });

    if (mailError) throw mailError;

    return new Response(`Sent ${ads.length} emails`);
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
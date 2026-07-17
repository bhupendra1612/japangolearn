"use client";

import type { AnalyticsEventName, AnalyticsProperties } from "@japangolearn/core";
import { createClient } from "@/lib/supabase/client";

const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;

export async function trackWebEvent(
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {}
) {
  if (!enabled) return;

  const sanitized = Object.fromEntries(
    Object.entries(properties).filter((entry) => entry[1] !== undefined)
  );

  const supabase = createClient();
  const { error } = await supabase.rpc("track_analytics_event", {
    p_event_name: name,
    p_properties: sanitized,
    p_source: "web",
  });

  if (error) {
    console.warn("Analytics event was not recorded:", error.message);
  }

  if (endpoint) {
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name,
        properties: sanitized,
        app: "web",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => undefined);
  }
}

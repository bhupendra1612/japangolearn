import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// Sentry's workerd export depends on edge files that Next's standalone trace
// does not copy. Workers' nodejs_compat runtime can use the Node export.
config.cloudflare = {
  ...config.cloudflare,
  useWorkerdCondition: false,
};

export default config;

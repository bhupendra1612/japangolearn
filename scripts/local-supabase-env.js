const { execPnpmSync } = require("./pnpm-process");

function getLocalSupabaseStatus() {
  const output = execPnpmSync(["exec", "supabase", "status", "--output", "json"], {
    encoding: "utf8",
  });
  return JSON.parse(output);
}

function readStatusValue(status, ...keys) {
  for (const key of keys) {
    if (status[key]) return status[key];
  }
  return undefined;
}

module.exports = { getLocalSupabaseStatus, readStatusValue };

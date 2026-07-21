const { execFileSync } = require("child_process");

function pnpmInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "pnpm", ...args],
    };
  }

  return { command: "pnpm", args };
}

function execPnpmSync(args, options) {
  const invocation = pnpmInvocation(args);
  return execFileSync(invocation.command, invocation.args, options);
}

module.exports = { execPnpmSync, pnpmInvocation };

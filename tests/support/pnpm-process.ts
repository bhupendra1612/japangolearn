import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";

export function execPnpmSync(
  args: string[],
  options: ExecFileSyncOptionsWithStringEncoding
): string {
  if (process.platform === "win32") {
    return execFileSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", "pnpm", ...args],
      options
    );
  }

  return execFileSync("pnpm", args, options);
}

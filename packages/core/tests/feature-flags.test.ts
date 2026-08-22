import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAGS,
  SERVER_KILL_SWITCHES,
  resolveFeatureFlags,
  resolveServerKillSwitches,
} from "../src";

describe("marketplace feature safety", () => {
  it("defaults every public marketplace flag off", () => {
    const flags = resolveFeatureFlags({});
    expect(FEATURE_FLAGS.every((flag) => flags[flag] === false)).toBe(true);
  });

  it("keeps every server command family killed by default", () => {
    const switches = resolveServerKillSwitches({});
    expect(SERVER_KILL_SWITCHES.every((name) => switches[name] === true)).toBe(true);
  });

  it("treats public visibility and server kill switches independently", () => {
    const flags = resolveFeatureFlags({ NEXT_PUBLIC_FEATURE_COURSE_CATALOG: "true" });
    const switches = resolveServerKillSwitches({});
    expect(flags.courseCatalog).toBe(true);
    expect(switches.teacherCommands).toBe(true);
  });
});

#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");
const { execPnpmSync } = require("./pnpm-process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "packages", "database", "src", "supabase.types.ts");
const PROJECT_ID = "teylstfbjtutssnfmhhu";
const useLocal = process.argv.includes("--local");
const useLinked = process.argv.includes("--linked");
const checkOnly = process.argv.includes("--check");

const sourceArgs = useLocal ? ["--local"] : useLinked ? ["--linked"] : ["--project-id", PROJECT_ID];
const args = [
  "exec",
  "supabase",
  "gen",
  "types",
  "--lang",
  "typescript",
  ...sourceArgs,
  "--schema",
  "public",
];

function generate() {
  const output = execPnpmSync(args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!output.includes("export type Database")) {
    throw new Error("Supabase CLI returned output that does not look like TypeScript types.");
  }

  return output;
}
function publicShape(filePath) {
  const program = ts.createProgram([filePath], {
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(filePath);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  const databaseSymbol = checker
    .getExportsOfModule(moduleSymbol)
    .find((symbol) => symbol.name === "Database");

  if (!databaseSymbol) throw new Error(`Database type missing from ${filePath}`);

  const databaseType = checker.getDeclaredTypeOfSymbol(databaseSymbol);
  const publicSymbol = databaseType.getProperty("public");
  const publicType = checker.getTypeOfSymbolAtLocation(publicSymbol, source);

  function memberShape(memberName, nestedName) {
    const member = publicType.getProperty(memberName);
    if (!member) return {};
    const memberType = checker.getTypeOfSymbolAtLocation(member, source);
    return Object.fromEntries(
      memberType
        .getProperties()
        .map((entry) => {
          const entryType = checker.getTypeOfSymbolAtLocation(entry, source);
          const nested = entryType.getProperty(nestedName);
          if (!nested) return [entry.name, []];
          const nestedType = checker.getTypeOfSymbolAtLocation(nested, source);
          return [
            entry.name,
            nestedType
              .getProperties()
              .map((property) => property.name)
              .sort(),
          ];
        })
        .sort(([left], [right]) => left.localeCompare(right))
    );
  }

  function functionShape() {
    const functions = publicType.getProperty("Functions");
    if (!functions) return {};
    const functionsType = checker.getTypeOfSymbolAtLocation(functions, source);

    return Object.fromEntries(
      functionsType
        .getProperties()
        .map((entry) => {
          const entryType = checker.getTypeOfSymbolAtLocation(entry, source);
          const args = entryType.getProperty("Args");
          const returns = entryType.getProperty("Returns");
          const argsType = args ? checker.getTypeOfSymbolAtLocation(args, source) : undefined;
          const returnsType = returns
            ? checker.getTypeOfSymbolAtLocation(returns, source)
            : undefined;
          const returnItemType = returnsType?.getNumberIndexType() ?? returnsType;

          return [
            entry.name,
            {
              args: argsType
                ? argsType
                    .getProperties()
                    .map((property) => property.name)
                    .sort()
                : [],
              returns: returnItemType
                ? returnItemType
                    .getProperties()
                    .map((property) => property.name)
                    .sort()
                : [],
            },
          ];
        })
        .sort(([left], [right]) => left.localeCompare(right))
    );
  }

  return {
    tables: memberShape("Tables", "Row"),
    functions: functionShape(),
  };
}

try {
  const output = generate();

  if (!checkOnly) {
    fs.writeFileSync(OUTPUT_FILE, output, "utf8");
    console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`);
    process.exit(0);
  }

  const tempFile = path.join(os.tmpdir(), `jgl-supabase-types-${process.pid}.ts`);
  fs.writeFileSync(tempFile, output, "utf8");
  try {
    const expected = publicShape(OUTPUT_FILE);
    const actual = publicShape(tempFile);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      console.error("Supabase database types have drifted.");
      console.error("Run `pnpm db:types` (linked) or `pnpm db:types:local` and commit the result.");
      process.exit(1);
    }
  } finally {
    fs.rmSync(tempFile, { force: true });
  }

  console.log("Supabase database type shape is current.");
} catch (error) {
  const message =
    error.stderr?.toString().trim() || error.stdout?.toString().trim() || error.message;
  console.error(
    checkOnly ? "Failed to verify Supabase types." : "Failed to generate Supabase types."
  );
  console.error(message);
  process.exit(1);
}

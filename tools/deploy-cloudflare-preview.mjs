import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const required = ["MONGODB_URI", "MONGODB_DB_NAME", "JWT_SECRET"];
for (const name of required) {
  if (typeof process.env[name] !== "string" || process.env[name].length === 0) {
    console.error(`Missing required Cloudflare Preview build secret: ${name}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const run = (args) => {
  const result = spawnSync(npx, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const directory = await mkdtemp(join(tmpdir(), "afsana-preview-secrets-"));
const secretsFile = join(directory, "preview-secrets.json");
try {
  await writeFile(
    secretsFile,
    JSON.stringify(Object.fromEntries(required.map((name) => [name, process.env[name]]))),
    { mode: 0o600 }
  );

  // Ensure this branch has a current Preview deployment first.
  run(["wrangler", "preview", "--config", "cloudflare/wrangler.toml"]);

  console.log("AFSANA Preview runtime secrets validated.");
} finally {
  await rm(directory, { recursive: true, force: true });
}

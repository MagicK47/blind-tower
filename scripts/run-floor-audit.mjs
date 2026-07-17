import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const temporaryDirectory = await mkdtemp(join(tmpdir(), "blind-tower-floor-audit-"));
const outputFile = join(temporaryDirectory, "floor-audit.mjs");

try {
  await build({
    entryPoints: [join(scriptDirectory, "floor-audit.ts")],
    outfile: outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "warning",
  });
  await import(`${pathToFileURL(outputFile).href}?run=${Date.now()}`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const temporaryDirectory = await mkdtemp(join(tmpdir(), "blind-tower-floor-smoke-"));
const outputFile = join(temporaryDirectory, "floor-runtime-smoke.mjs");

try {
  await build({
    entryPoints: [join(scriptDirectory, "floor-runtime-smoke.ts")],
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

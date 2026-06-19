import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync, watch, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const isWatch = process.argv.includes("--watch");

mkdirSync(dist, { recursive: true });

const sharedPath = path.resolve(__dirname, "../shared/contracts.ts");

function writeContentCss() {
  const base = readFileSync(path.join(__dirname, "src/content/content.css"), "utf8");
  const panel = readFileSync(path.join(__dirname, "src/content/ui/genie-panel.css"), "utf8");
  writeFileSync(path.join(dist, "content.css"), `${base}\n\n${panel}`);
}

const common = {
  bundle: true,
  sourcemap: true,
  target: "chrome120",
  logLevel: "info",
};

async function build() {
  cpSync(path.join(__dirname, "manifest.json"), path.join(dist, "manifest.json"));
  cpSync(path.join(__dirname, "src/popup/popup.html"), path.join(dist, "popup.html"));
  cpSync(path.join(__dirname, "src/popup/popup.css"), path.join(dist, "popup.css"));
  writeContentCss();

  await esbuild.build({
    ...common,
    entryPoints: [path.join(__dirname, "src/content/index.ts")],
    outfile: path.join(dist, "content.js"),
    format: "iife",
    alias: { "@shared": sharedPath },
  });

  await esbuild.build({
    ...common,
    entryPoints: [path.join(__dirname, "src/popup/popup.ts")],
    outfile: path.join(dist, "popup.js"),
    format: "iife",
  });

  await esbuild.build({
    ...common,
    entryPoints: [path.join(__dirname, "src/background/service-worker.ts")],
    outfile: path.join(dist, "service-worker.js"),
    format: "iife",
  });

  console.log("[extension] built to dist/");
}

if (isWatch) {
  const ctx = await esbuild.context({
    ...common,
    entryPoints: [path.join(__dirname, "src/content/index.ts")],
    outfile: path.join(dist, "content.js"),
    format: "iife",
    alias: { "@shared": sharedPath },
  });
  await ctx.watch();
  console.log("[extension] watching...");
} else {
  await build();
}

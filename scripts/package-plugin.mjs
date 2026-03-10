import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const packageJsonPath = path.join(rootDir, "package.json");
const manifestTemplatePath = path.join(rootDir, "assets", "manifest.template.json");
const distDir = path.join(rootDir, "dist");
const imagesDir = path.join(rootDir, "assets", "images");
const releaseDir = path.join(rootDir, "release");

if (!fs.existsSync(distDir)) {
  throw new Error("dist/ is missing. Run `npm run build:ts` before packaging.");
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestTemplatePath, "utf8"));
manifest.Version = packageJson.version;

const firstActionUuid = manifest.Actions?.[0]?.UUID;
if (typeof firstActionUuid !== "string" || firstActionUuid.length === 0) {
  throw new Error("manifest.template.json must include at least one action UUID.");
}

const pluginId = firstActionUuid.split(".").slice(0, -1).join(".");
if (!pluginId) {
  throw new Error(`Cannot derive plugin id from action UUID: ${firstActionUuid}`);
}

const pluginFolderName = `${pluginId}.sdPlugin`;
const pluginFolderPath = path.join(releaseDir, pluginFolderName);
const artifactPath = path.join(releaseDir, `${pluginId}-${packageJson.version}.streamDeckPlugin`);

fs.rmSync(pluginFolderPath, { recursive: true, force: true });
fs.rmSync(artifactPath, { force: true });
fs.mkdirSync(pluginFolderPath, { recursive: true });

fs.cpSync(distDir, path.join(pluginFolderPath, "dist"), { recursive: true });
fs.cpSync(imagesDir, path.join(pluginFolderPath, "images"), { recursive: true });
fs.writeFileSync(path.join(pluginFolderPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

execFileSync("zip", ["-rq", artifactPath, pluginFolderName], {
  cwd: releaseDir,
  stdio: "inherit"
});

console.log(`Packaged plugin folder: ${pluginFolderPath}`);
console.log(`Packaged artifact: ${artifactPath}`);

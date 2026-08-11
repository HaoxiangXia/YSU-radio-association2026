import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const backendDirectory = join(repositoryRoot, "backend");
const runtimeDirectory = mkdtempSync(join(tmpdir(), "ysu-radio-e2e-"));
const databasePath = join(runtimeDirectory, "database.sqlite");
const uvCachePath = join(runtimeDirectory, "uv-cache");
const configPath = join(repositoryRoot, "tests", "fixtures", "recruitment.e2e.json");
const admissionsPath = join(repositoryRoot, "tests", "fixtures", "admissions.e2e.json");

const child = spawn(
  "uv",
  [
    "run",
    "--offline",
    "uvicorn",
    "app:app",
    "--host",
    "127.0.0.1",
    "--port",
    "43127",
  ],
  {
    cwd: backendDirectory,
    env: {
      ...process.env,
      UV_CACHE_DIR: uvCachePath,
      DATABASE_PATH: databasePath,
      RECRUITMENT_CONFIG_PATH: configPath,
      ADMISSIONS_DATA_PATH: admissionsPath,
      JWT_SECRET: "e2e-only-jwt-secret-with-at-least-32-characters",
      OFFICER_USERNAME: "officer",
      OFFICER_PASSWORD: "test-password",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);

let stopping = false;

function cleanRuntimeDirectory() {
  const normalized = resolve(runtimeDirectory);
  const expectedPrefix = resolve(tmpdir(), "ysu-radio-e2e-");
  if (normalized.startsWith(expectedPrefix)) {
    rmSync(normalized, { recursive: true, force: true });
  }
}

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  child.kill(signal);
  setTimeout(() => child.kill("SIGKILL"), 3000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

child.on("error", (error) => {
  console.error(`无法启动 E2E 服务：${error.message}`);
  cleanRuntimeDirectory();
  process.exit(1);
});

child.on("exit", (code, signal) => {
  cleanRuntimeDirectory();
  if (!stopping && code !== 0) {
    console.error(`E2E 服务异常退出：${signal || code}`);
  }
  process.exit(code ?? (stopping ? 0 : 1));
});

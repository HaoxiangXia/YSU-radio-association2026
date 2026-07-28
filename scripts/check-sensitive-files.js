import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";


function gitFiles(args) {
  const result = Bun.spawnSync(["git", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(result.stderr).trim());
  }
  return new TextDecoder()
    .decode(result.stdout)
    .split("\0")
    .filter(Boolean);
}


function normalize(path) {
  return path.replaceAll("\\", "/");
}


function forbiddenPathReason(path) {
  const normalized = normalize(path);
  const lower = normalized.toLowerCase();
  const file = basename(lower);

  if (
    (file === ".env" || file.startsWith(".env."))
    && file !== ".env.example"
  ) {
    return "环境变量文件";
  }
  if (/\.(sqlite|sqlite3|db)(?:-(?:shm|wal))?$/.test(lower)) {
    return "SQLite 数据库";
  }
  if (/\.(xlsx|xls|xlsm|xlsb)$/.test(lower)) {
    return "Excel 文件";
  }
  if (file === "admission-results.json") {
    return "录取名单 JSON";
  }
  if (lower === "config/recruitment.local.json") {
    return "本地真实业务配置";
  }
  if (
    lower.startsWith("config/recruitment.")
    && lower.endsWith(".json")
    && lower !== "config/recruitment.example.json"
  ) {
    return "非模板业务配置";
  }
  return "";
}


function uniqueMatches(text, pattern) {
  return new Set(text.match(pattern) || []);
}


const contentScanExtensions = new Set([
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".tsv",
  ".txt",
]);
const candidates = new Set([
  ...gitFiles(["ls-files", "-z"]),
  ...gitFiles(["ls-files", "--others", "--exclude-standard", "-z"]),
]);
const failures = [];

for (const path of [...candidates].sort()) {
  const reason = forbiddenPathReason(path);
  if (reason) {
    failures.push(`${path}: 禁止提交${reason}`);
    continue;
  }

  let stats;
  try {
    stats = statSync(path);
  } catch {
    continue;
  }
  if (!stats.isFile() || stats.size > 3 * 1024 * 1024) continue;
  if (!contentScanExtensions.has(extname(path).toLowerCase())) continue;

  const buffer = readFileSync(path);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  const studentIds = uniqueMatches(text, /(?<!\d)\d{12}(?!\d)/g);
  const phones = uniqueMatches(text, /(?<!\d)1[3-9]\d{9}(?!\d)/g);
  if (studentIds.size >= 5) {
    failures.push(`${path}: 包含 ${studentIds.size} 个不同的 12 位号码，疑似批量学号`);
  }
  if (phones.size >= 5) {
    failures.push(`${path}: 包含 ${phones.size} 个不同的手机号，疑似批量联系方式`);
  }
}

if (failures.length) {
  console.error("数据防误提交检查失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`数据防误提交检查通过（检查 ${candidates.size} 个待提交候选文件）`);

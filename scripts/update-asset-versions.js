import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");
const PUBLIC_HTML_DIR = join(REPO_ROOT, "public", "html");
const FRONTEND_SRC_DIR = join(REPO_ROOT, "frontend", "src");

// 1. 递归扫描 public/html/ 下的所有 .css 和 .js 文件，计算 8 位 sha256 内容哈希
export function getAssetHashes() {
  const hashes = new Map();

  function scan(dir, prefix = "") {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir)) {
      const full = join(dir, ent);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        scan(full, prefix + ent + "/");
      } else if (stat.isFile() && (ent.endsWith(".css") || ent.endsWith(".js"))) {
        const content = readFileSync(full);
        const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
        hashes.set(prefix + ent, hash);
      }
    }
  }

  scan(PUBLIC_HTML_DIR);
  return hashes;
}

// 2. 收集需要检查/更新的源文件（.astro 与 .html）
export function getTargetFiles() {
  const files = [];

  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== "node_modules" && ent.name !== ".git" && ent.name !== "dist") {
          walk(full);
        }
      } else if (full.endsWith(".html") || full.endsWith(".astro")) {
        files.push(full);
      }
    }
  }

  walk(FRONTEND_SRC_DIR);
  walk(PUBLIC_HTML_DIR);
  return files;
}

// 3. 匹配 /html/... 静态资源的正则：href="..." 或 src="..."
export const ASSET_REF_REGEX = /(href|src)=(["'])\/html\/([a-zA-Z0-9_\-\/.]+\.(?:css|js))(?:\?[^"']*)?\2/g;

export function updateAssetVersions({ check = false } = {}) {
  const hashes = getAssetHashes();
  const targetFiles = getTargetFiles();
  const mismatches = [];
  let updatedFileCount = 0;

  for (const file of targetFiles) {
    const originalContent = readFileSync(file, "utf8");
    let changed = false;

    const newContent = originalContent.replaceAll(ASSET_REF_REGEX, (match, attr, quote, assetKey) => {
      const hash = hashes.get(assetKey);
      if (!hash) {
        mismatches.push({
          file,
          assetKey,
          error: `引用的静态资源不存在: /html/${assetKey}`,
        });
        return match;
      }

      const expected = `${attr}=${quote}/html/${assetKey}?v=${hash}${quote}`;
      if (match !== expected) {
        changed = true;
        if (check) {
          mismatches.push({
            file,
            assetKey,
            current: match,
            expected,
          });
        }
      }
      return expected;
    });

    if (changed && !check) {
      writeFileSync(file, newContent, "utf8");
      updatedFileCount++;
    }
  }

  return {
    hashes,
    mismatches,
    updatedFileCount,
    totalFiles: targetFiles.length,
  };
}

if (import.meta.main) {
  const isCheck = process.argv.includes("--check");
  const result = updateAssetVersions({ check: isCheck });

  if (isCheck) {
    if (result.mismatches.length > 0) {
      console.error(`❌ 发现 ${result.mismatches.length} 处静态资源版本号不一致：`);
      for (const m of result.mismatches) {
        if (m.error) {
          console.error(`  - [${m.file}] ${m.error}`);
        } else {
          console.error(`  - [${m.file}] ${m.current} -> 应为 ${m.expected}`);
        }
      }
      console.error(`请运行 "bun run update:assets" 同步静态资源版本号。`);
      process.exit(1);
    } else {
      console.log(`✅ 所有静态资源版本号均与文件内容哈希一致（检查了 ${result.totalFiles} 个文件，${result.hashes.size} 个静态资源）。`);
    }
  } else {
    console.log(`✅ 静态资源版本号更新完成（共扫描 ${result.hashes.size} 个资源，更新了 ${result.updatedFileCount}/${result.totalFiles} 个文件）。`);
  }
}

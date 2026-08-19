import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";


function gitFiles() {
  const result = Bun.spawnSync(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (result.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(result.stderr).trim());
  }
  return new TextDecoder()
    .decode(result.stdout)
    .split("\0")
    .filter(Boolean);
}


const failures = [];
const files = gitFiles();
const normalizedFiles = files.map((path) => path.replaceAll("\\", "/"));
const existingFiles = normalizedFiles.filter((path) => existsSync(path));
const javascriptFiles = existingFiles.filter(
  (path) =>
    extname(path).toLowerCase() === ".js"
    && !path.replaceAll("\\", "/").startsWith("public/html/vendor/"),
);

for (const path of javascriptFiles) {
  const result = Bun.spawnSync(["node", "--check", path], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    failures.push(
      `${path}: ${new TextDecoder().decode(result.stderr).trim()}`,
    );
  }
}

for (const path of existingFiles.filter(
  (candidate) => extname(candidate) === ".html",
)) {
  const html = readFileSync(path, "utf8");
  const inlineScripts = html.matchAll(
    /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi,
  );
  let index = 0;
  for (const match of inlineScripts) {
    index += 1;
    try {
      new Function(match[1]);
    } catch (error) {
      failures.push(`${path} 内联脚本 ${index}: ${error.message}`);
    }
  }
}

const sourcePrefix = "source-assets/image-originals/";
const sourceImageFiles = existingFiles.filter(
  (path) =>
    path.startsWith(sourcePrefix)
    && [".jpg", ".jpeg", ".png"].includes(extname(path).toLowerCase()),
);
const sourceKeys = new Set(
  sourceImageFiles.map((path) => `/image/${path.slice(sourcePrefix.length)}`),
);
// Historical material intentionally retained for future reuse or cache
// compatibility, but not presented as part of the current page records.
const archivedSourceKeys = new Set([
  "/image/competitions/zhanwang-cup/photo-01.jpg",
  "/image/competitions/zhanwang-cup/photo-02.jpg",
  "/image/competitions/zhanwang-cup/photo-03.jpg",
  "/image/competitions/zhanwang-cup/photo-04.jpg",
  "/image/honors/2025-digital-media-national-first.jpg",
  "/image/honors/2026-business-elite-national-first.jpg",
  "/image/honors/2026-enterprise-simulation-national-second.jpg",
]);
const standaloneImages = new Map([
  [
    "/image/brand/association-emblem-white.png",
    "public/image/brand/association-emblem-white.png",
  ],
]);
const referenceFiles = existingFiles.filter(
  (path) =>
    path.startsWith("public/html/")
    && [".html", ".js", ".css"].includes(extname(path).toLowerCase())
    && path !== "public/html/image-assets.js"
    && !path.startsWith("public/html/vendor/"),
);
const logicalImageReferences = new Set();
const logicalImagePattern = /\/image\/[A-Za-z0-9._/-]+\.(?:jpe?g|png)/gi;
for (const path of referenceFiles) {
  const content = readFileSync(path, "utf8");
  for (const match of content.matchAll(logicalImagePattern)) {
    logicalImageReferences.add(match[0]);
  }
}

let responsiveManifest = {};
const manifestPath = "public/html/image-assets.js";
try {
  const manifestSource = readFileSync(manifestPath, "utf8");
  const manifestMatch = manifestSource.match(
    /window\.RESPONSIVE_IMAGE_ASSETS\s*=\s*Object\.freeze\((\{.*\})\);\s*$/s,
  );
  if (!manifestMatch) {
    failures.push(`${manifestPath}: 无法解析响应式图片清单`);
  } else {
    responsiveManifest = JSON.parse(manifestMatch[1]);
  }
} catch (error) {
  failures.push(`${manifestPath}: ${error.message}`);
}

const manifestKeys = new Set(Object.keys(responsiveManifest));
for (const sourceKey of sourceKeys) {
  if (
    !logicalImageReferences.has(sourceKey)
    && !archivedSourceKeys.has(sourceKey)
  ) {
    failures.push(`未被页面引用的原图：${sourceKey}`);
  }
  if (!manifestKeys.has(sourceKey)) {
    failures.push(`原图缺少响应式清单条目：${sourceKey}`);
  }
}

for (const reference of logicalImageReferences) {
  if (standaloneImages.has(reference)) {
    const standalonePath = standaloneImages.get(reference);
    if (!existsSync(standalonePath)) {
      failures.push(`独立图片不存在：${reference} -> ${standalonePath}`);
    }
    continue;
  }
  if (!sourceKeys.has(reference)) {
    failures.push(`页面引用缺少原图：${reference}`);
  }
  if (!manifestKeys.has(reference)) {
    failures.push(`页面引用缺少响应式清单条目：${reference}`);
  }
}

const manifestVariants = new Set();
for (const [sourceKey, asset] of Object.entries(responsiveManifest)) {
  if (!sourceKeys.has(sourceKey)) {
    failures.push(`清单包含不存在或未使用的原图：${sourceKey}`);
  }
  if (!Array.isArray(asset?.variants) || asset.variants.length === 0) {
    failures.push(`清单条目没有响应式变体：${sourceKey}`);
    continue;
  }
  for (const variant of asset.variants) {
    if (
      typeof variant?.src !== "string"
      || !variant.src.startsWith("/image/")
      || extname(variant.src).toLowerCase() !== ".webp"
    ) {
      failures.push(`清单包含无效变体：${sourceKey}`);
      continue;
    }
    const variantPath = `public${variant.src}`;
    manifestVariants.add(variantPath);
    if (!existsSync(variantPath)) {
      failures.push(`清单变体不存在：${variant.src}`);
    }
  }
}

const generatedWebpFiles = new Set(
  existingFiles.filter(
    (path) =>
      path.startsWith("public/image/")
      && extname(path).toLowerCase() === ".webp",
  ),
);
for (const path of generatedWebpFiles) {
  if (!manifestVariants.has(path)) {
    failures.push(`未进入响应式清单的 WebP：${path}`);
  }
}

if (failures.length) {
  console.error("前端源文件检查失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `前端源文件语法检查通过（${javascriptFiles.length} 个 JS 文件，`
  + `${existingFiles.filter((path) => extname(path) === ".html").length} 个 HTML 文件）`,
);
console.log(
  `图片引用检查通过（${sourceKeys.size} 张响应式原图，`
  + `${manifestVariants.size} 个 WebP，`
  + `${standaloneImages.size} 个独立图片）`,
);

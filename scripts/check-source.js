import { readFileSync } from "node:fs";
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
const javascriptFiles = files.filter(
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

for (const path of files.filter((candidate) => extname(candidate) === ".html")) {
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

if (failures.length) {
  console.error("前端源文件语法检查失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `前端源文件语法检查通过（${javascriptFiles.length} 个 JS 文件，`
  + `${files.filter((path) => extname(path) === ".html").length} 个 HTML 文件）`,
);

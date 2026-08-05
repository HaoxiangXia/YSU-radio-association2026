const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PRIVATE_DIRECTORY = path.resolve(
  REPOSITORY_ROOT,
  '..',
  'YSU-radio-association-private',
);
const ALLOWED_STATUSES = new Set(['已录取', '未录取']);

function normalize(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function isBlankRow(row) {
  return !row || row.every((value) => normalize(value) === '');
}

function isInsideRepository(targetPath) {
  const relative = path.relative(REPOSITORY_ROOT, targetPath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function validateRecord(row, excelRowNumber) {
  const record = {
    name: normalize(row[0]),
    studentId: normalize(row[1]),
    phone: normalize(row[2]),
    department: normalize(row[3]),
    status: normalize(row[4]),
  };
  const errors = [];

  if (!record.name || record.name.length > 30) {
    errors.push('姓名必须为 1 到 30 个字符');
  }
  if (!/^\d{12}$/.test(record.studentId)) {
    errors.push('学号必须为 12 位数字');
  }
  if (!/^1[3-9]\d{9}$/.test(record.phone)) {
    errors.push('手机号格式无效');
  }
  if (record.department.length > 100) {
    errors.push('录取部门不能超过 100 个字符');
  }
  if (!ALLOWED_STATUSES.has(record.status)) {
    errors.push('录取结果只能为“已录取”或“未录取”');
  }

  return { record, errors: errors.map((message) => `第 ${excelRowNumber} 行：${message}`) };
}

function readAdmissions(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const records = [];
  const errors = [];
  const seen = new Map();

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (isBlankRow(row)) continue;

    const excelRowNumber = index + 1;
    const validation = validateRecord(row, excelRowNumber);
    if (validation.errors.length) {
      errors.push(...validation.errors);
      continue;
    }

    const firstRow = seen.get(validation.record.studentId);
    if (firstRow) {
      errors.push(`第 ${excelRowNumber} 行：学号与第 ${firstRow} 行重复`);
      continue;
    }
    seen.set(validation.record.studentId, excelRowNumber);
    records.push(validation.record);
  }

  if (errors.length) {
    const preview = errors.slice(0, 20).join('\n');
    const remaining = errors.length > 20 ? `\n另有 ${errors.length - 20} 个错误未显示。` : '';
    throw new Error(`录取名单校验失败，共 ${errors.length} 个错误：\n${preview}${remaining}`);
  }
  if (records.length === 0) {
    throw new Error('录取名单中没有可导出的有效记录。');
  }
  return records;
}

function writeJsonAtomically(outputPath, records) {
  const outputDirectory = path.dirname(outputPath);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const temporaryPath = path.join(
    outputDirectory,
    `.${path.basename(outputPath)}.${process.pid}.tmp`,
  );
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function main() {
  const defaultInput = path.resolve(REPOSITORY_ROOT, '工作簿1.xlsx');
  const defaultOutput = process.env.ADMISSIONS_DATA_PATH
    ? path.resolve(process.env.ADMISSIONS_DATA_PATH)
    : path.resolve(DEFAULT_PRIVATE_DIRECTORY, 'admission-results.json');

  const inputPath = path.resolve(process.argv[2] || defaultInput);
  const outputPath = path.resolve(process.argv[3] || defaultOutput);

  if (isInsideRepository(outputPath)) {
    throw new Error('录取名单输出路径必须位于 Git 仓库之外。');
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Excel 源文件不存在：${inputPath}`);
  }

  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel 文件中没有工作表。');
  }

  const records = readAdmissions(workbook.Sheets[firstSheetName]);
  records.sort((a, b) => a.studentId.localeCompare(b.studentId));
  writeJsonAtomically(outputPath, records);
  console.log(`已安全导出 ${records.length} 条录取结果到私有路径：${outputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`导出失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  isInsideRepository,
  readAdmissions,
  validateRecord,
  writeJsonAtomically,
};

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function toRecord(name, studentId) {
  const cleanId = studentId === undefined || studentId === null ? '' : String(studentId).trim();
  if (!cleanId) {
    return null;
  }
  const cleanName = typeof name === 'string' ? name.trim() : name === undefined || name === null ? '' : String(name).trim();
  return { studentId: cleanId, name: cleanName };
}

function readAdmissions(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const records = [];
  const seen = new Map();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length === 0) {
      continue;
    }
    const record = toRecord(row[0], row[1]);
    if (!record) {
      continue;
    }

    if (seen.has(record.studentId)) {
      console.warn(`Duplicate studentId detected (keeping first): ${record.studentId}`);
      continue;
    }
    seen.set(record.studentId, true);
    records.push(record);
  }

  return records;
}

function main() {
  const defaultInput = path.resolve(__dirname, '../工作簿1.xlsx');
  const defaultOutput = path.resolve(__dirname, '../public/data/admissions.json');

  const inputPath = path.resolve(process.argv[2] || defaultInput);
  const outputPath = path.resolve(process.argv[3] || defaultOutput);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Excel source not found: ${inputPath}`);
    process.exitCode = 1;
    return;
  }

  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    console.error('❌ No worksheets found in workbook.');
    process.exitCode = 1;
    return;
  }

  const sheet = workbook.Sheets[firstSheetName];
  const records = readAdmissions(sheet);

  if (records.length === 0) {
    console.warn('⚠️ No valid admissions records found. Output will be empty.');
  }

  records.sort((a, b) => a.studentId.localeCompare(b.studentId));

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
  console.log(`✅ Exported ${records.length} records to ${outputPath}`);
}

main();

import { expect, test } from 'bun:test';
import XLSX from 'xlsx';
import { readAdmissions } from '../scripts/export-admissions.js';

function sheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

test('two-column export matches the admission model and allows identical names', () => {
  expect(readAdmissions(sheet([
    ['姓名', '学号'], [' 同名 ', '202600000001'], [], ['同名', 202600000002],
  ]))).toEqual([
    { name: '同名', studentId: '202600000001', department: '', status: '已录取' },
    { name: '同名', studentId: '202600000002', department: '', status: '已录取' },
  ]);
});

test('legacy columns and incorrect header order are rejected', () => {
  for (const headers of [['姓名', '学号', '申请手机号', '录取部门'], ['学号', '姓名']]) {
    expect(() => readAdmissions(sheet([headers, ['测试', '202600000001']]))).toThrow('表头');
  }
});

test('duplicate IDs, invalid rows and extra values are rejected', () => {
  for (const rows of [
    [['测试', '202600000001'], ['测试', '202600000001']],
    [['测试', '123']], [['', '202600000001']],
    [['测试', '202600000001', '额外内容']],
  ]) {
    expect(() => readAdmissions(sheet([['姓名', '学号'], ...rows]))).toThrow('校验失败');
  }
});

test('formulas, empty lists and excessive rows are rejected', () => {
  const formulaSheet = sheet([['姓名', '学号'], ['测试', '202600000001']]);
  formulaSheet.A2.f = '"测试"';
  expect(() => readAdmissions(formulaSheet)).toThrow('公式');
  expect(() => readAdmissions(sheet([['姓名', '学号']]))).toThrow('没有可导出');
  const rows = Array.from({ length: 2001 }, (_, i) => ['测试', String(202600000000 + i)]);
  expect(() => readAdmissions(sheet([['姓名', '学号'], ...rows]))).toThrow('2000');
});

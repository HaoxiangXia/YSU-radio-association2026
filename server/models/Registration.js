// 修改 models/Registration.js
const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true },
  college: { type: String, required: true },
  grade: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  experience: { type: String, required: true },
  expectation: { type: String },
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt 字段
});

module.exports = mongoose.model('Registration', RegistrationSchema);
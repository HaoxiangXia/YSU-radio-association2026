function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRegistrationSettings() {
  const start = parseDate(process.env.REGISTRATION_START);
  const end = parseDate(process.env.REGISTRATION_END);
  const notice = (process.env.REGISTRATION_NOTICE || '报名暂未开放，请留意协会后续通知。').trim();
  const now = new Date();
  const enabled = process.env.REGISTRATION_OPEN === 'true';

  if (!enabled) {
    return { available: false, code: 'closed', notice, start, end };
  }
  if (!start || !end || start >= end) {
    return { available: false, code: 'misconfigured', notice: '报名时间尚未正确配置，请联系协会负责人。', start, end };
  }
  if (now < start) {
    return { available: false, code: 'not_started', notice: '报名尚未开始，请在开放时间内提交。', start, end };
  }
  if (now > end) {
    return { available: false, code: 'ended', notice: '本次报名已结束，感谢你的关注。', start, end };
  }

  return { available: true, code: 'open', notice, start, end };
}

function getAdminSettings() {
  return {
    username: (process.env.ADMIN_USERNAME || '').trim(),
    passwordHash: (process.env.ADMIN_PASSWORD_HASH || '').trim(),
    jwtSecret: (process.env.JWT_SECRET || '').trim(),
  };
}

module.exports = { getAdminSettings, getRegistrationSettings };

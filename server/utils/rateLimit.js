const buckets = new Map();

function getActiveBucket(key, windowMs) {
  const now = Date.now();
  const bucket = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (bucket.length > 0) buckets.set(key, bucket);
  else buckets.delete(key);
  return { bucket, now };
}

function checkRateLimit({ key, limit, windowMs }) {
  const { bucket, now } = getActiveBucket(key, windowMs);

  if (bucket.length >= limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket[0] + windowMs - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

function recordRateLimit({ key, windowMs }) {
  const { bucket, now } = getActiveBucket(key, windowMs);
  bucket.push(now);
  buckets.set(key, bucket);
}

function clearRateLimit(key) {
  buckets.delete(key);
}

function rateLimit(options) {
  const attempt = checkRateLimit(options);
  if (!attempt.allowed) return attempt;

  recordRateLimit(options);
  return attempt;
}

module.exports = { checkRateLimit, clearRateLimit, rateLimit, recordRateLimit };

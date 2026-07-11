const buckets = new Map();

function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const bucket = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

  if (bucket.length >= limit) {
    buckets.set(key, bucket);
    return { allowed: false, retryAfter: Math.ceil((bucket[0] + windowMs - now) / 1000) };
  }

  bucket.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfter: 0 };
}

module.exports = { rateLimit };

const crypto = require("crypto");

// Returns today's date as YYYY-MM-DD in UTC, used as the daily seed so
// everyone's number resets at the same time regardless of timezone.
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Deterministic 0-100 roll for a given user on a given day.
// Same user + same day always produces the same number (like the
// original "how gay" bot), but it changes once the date rolls over.
function rollRekt(userId, dateKey = todayKey()) {
  const hash = crypto
    .createHash("sha256")
    .update(`how-rekt:${userId}:${dateKey}`)
    .digest();

  const percent = hash.readUInt32BE(0) % 101; // 0-100 inclusive
  const seedIndex = hash.readUInt32BE(4); // used to pick which flavor line

  return { percent, seedIndex, dateKey };
}

module.exports = { rollRekt, todayKey };

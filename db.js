const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "rekt.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS rolls (
    chat_id     TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    username    TEXT,
    date_key    TEXT NOT NULL,
    percent     INTEGER NOT NULL,
    PRIMARY KEY (chat_id, user_id, date_key)
  );
`);

const upsertRoll = db.prepare(`
  INSERT INTO rolls (chat_id, user_id, username, date_key, percent)
  VALUES (@chatId, @userId, @username, @dateKey, @percent)
  ON CONFLICT(chat_id, user_id, date_key)
  DO UPDATE SET username = excluded.username
`);

function recordRoll({ chatId, userId, username, dateKey, percent }) {
  upsertRoll.run({ chatId: String(chatId), userId: String(userId), username, dateKey, percent });
}

const todayLeaderboardStmt = db.prepare(`
  SELECT username, percent
  FROM rolls
  WHERE chat_id = ? AND date_key = ?
  ORDER BY percent DESC
  LIMIT ?
`);

function getTodayLeaderboard(chatId, dateKey, limit = 10) {
  return todayLeaderboardStmt.all(String(chatId), dateKey, limit);
}

const hallOfShameStmt = db.prepare(`
  SELECT username, MAX(percent) AS percent, date_key
  FROM rolls
  WHERE chat_id = ?
  GROUP BY user_id
  ORDER BY percent DESC
  LIMIT ?
`);

function getHallOfShame(chatId, limit = 10) {
  return hallOfShameStmt.all(String(chatId), limit);
}

module.exports = { recordRoll, getTodayLeaderboard, getHallOfShame };

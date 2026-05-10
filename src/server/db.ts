import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';

import type { User } from '../common/auth.d.ts';

mkdirSync('./data', { recursive: true });
const db = new DatabaseSync('./data/game.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS gameRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    isFailed INTEGER CHECK (isFailed IN (0, 1)) NOT NULL,
    hitRate REAL NOT NULL,
    remainingHealth INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username)
  );
`);

export function addUser(username: string, password: string) {
  const prepareStatement = db.prepare(
    'INSERT INTO users (username, password) VALUES (?, ?)',
  );
  prepareStatement.run(username, password);
}

export function getUser(username: string): Required<User> | undefined {
  const prepareStatement = db.prepare('SELECT * FROM users WHERE username = ?');
  return prepareStatement.get(username) as Required<User> | undefined;
}

export function addGameRecord(
  username: string,
  isFailed: boolean,
  hitRate: number,
  remainingHealth: number,
) {
  const prepareStatement = db.prepare(`
    INSERT INTO gameRecords (username, isFailed, hitRate, remainingHealth)
    VALUES (?, ?, ?, ?)
  `);

  return prepareStatement.run(
    username,
    isFailed ? 1 : 0,
    hitRate,
    remainingHealth,
  ).lastInsertRowid;
}

export function getGameRecords() {
  const prepareStatement = db.prepare(`
    SELECT * FROM gameRecords
    ORDER BY isFailed ASC, hitRate DESC, remainingHealth DESC, timestamp DESC
  `);
  return prepareStatement.all();
}

export function closeDb() {
  db.close();
}

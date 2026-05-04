import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./data/game.db');

db.exec(`
  DROP TABLE IF EXISTS gameRecords;
`);

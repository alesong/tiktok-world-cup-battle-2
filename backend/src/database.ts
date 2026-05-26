import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

export const run = (sql: string, params: any[] = []): Promise<{ id: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const all = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const initDb = async () => {
  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      flag TEXT,
      primaryColor TEXT,
      secondaryColor TEXT,
      jerseyColor TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS donors (
      username TEXT PRIMARY KEY,
      diamonds INTEGER,
      teamId TEXT,
      avatar TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      localTeamId TEXT,
      visitorTeamId TEXT,
      localScore INTEGER,
      visitorScore INTEGER,
      winnerId TEXT,
      mvpUsername TEXT,
      mvpDiamonds INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Set default settings if not exists
  const defaultSettings = [
    { key: 'admin_password', value: 'admin123' },
    { key: 'goal_distance_diamonds', value: '200' },
    { key: 'goal_distance_pixels', value: '600' },
    { key: 'match_mode', value: 'goals' }, // goals, time, diamonds
    { key: 'match_limit', value: '3' }, // 3 goals, or 300 seconds (5 min), or 50000 diamonds
    { key: 'volume', value: '0.5' },
    { key: 'event_multiplier', value: '1' }, // 1 or 2
    { key: 'event_gold_goal', value: 'false' },
    { key: 'event_penalty', value: 'none' }, // none, local, visitor
    { key: 'event_turbo', value: 'false' },
    { key: 'local_team_id', value: 'ARG' },
    { key: 'visitor_team_id', value: 'BRA' },
    { key: 'local_score', value: '0' },
    { key: 'visitor_score', value: '0' },
    { key: 'ball_progress', value: '0' },
    { key: 'match_state', value: 'idle' }, // idle, playing, celebrating, finished
    { key: 'overlay_resolution', value: '1920x1080' },
    {
      key: 'gift_values',
      value: JSON.stringify({
        'Rosa': 1,
        'TikTok': 1,
        'Perfume': 20,
        'Corazon': 5,
        'Sombrero': 99,
        'Leon': 29999,
        'Universo': 34999
      })
    }
  ];

  for (const setting of defaultSettings) {
    await run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [setting.key, setting.value]);
  }

  // Set pre-populated teams
  const defaultTeams = [
    { id: 'ARG', name: 'Argentina', flag: '🇦🇷', primaryColor: '#74ACDF', secondaryColor: '#FFFFFF', jerseyColor: '#74ACDF' },
    { id: 'BRA', name: 'Brasil', flag: '🇧🇷', primaryColor: '#FEDF00', secondaryColor: '#009739', jerseyColor: '#FEDF00' },
    { id: 'COL', name: 'Colombia', flag: '🇨🇴', primaryColor: '#FCD116', secondaryColor: '#003893', jerseyColor: '#FCD116' },
    { id: 'FRA', name: 'Francia', flag: '🇫🇷', primaryColor: '#002395', secondaryColor: '#ED2939', jerseyColor: '#002395' },
    { id: 'ESP', name: 'España', flag: '🇪🇸', primaryColor: '#C60B1E', secondaryColor: '#F1BF00', jerseyColor: '#C60B1E' },
    { id: 'GER', name: 'Alemania', flag: '🇩🇪', primaryColor: '#000000', secondaryColor: '#DD0000', jerseyColor: '#FFFFFF' },
    { id: 'POR', name: 'Portugal', flag: '🇵🇹', primaryColor: '#046A38', secondaryColor: '#DA291C', jerseyColor: '#DA291C' },
    { id: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', primaryColor: '#FFFFFF', secondaryColor: '#CF081F', jerseyColor: '#FFFFFF' },
    { id: 'URU', name: 'Uruguay', flag: '🇺🇾', primaryColor: '#007FFF', secondaryColor: '#FFFFFF', jerseyColor: '#007FFF' },
    { id: 'MEX', name: 'México', flag: '🇲🇽', primaryColor: '#006847', secondaryColor: '#C8102E', jerseyColor: '#006847' },
    { id: 'JPN', name: 'Japón', flag: '🇯🇵', primaryColor: '#00005F', secondaryColor: '#FFFFFF', jerseyColor: '#00005F' },
    { id: 'MAR', name: 'Marruecos', flag: '🇲🇦', primaryColor: '#C1272D', secondaryColor: '#006233', jerseyColor: '#C1272D' }
  ];

  for (const team of defaultTeams) {
    await run(
      'INSERT OR REPLACE INTO teams (id, name, flag, primaryColor, secondaryColor, jerseyColor) VALUES (?, ?, ?, ?, ?, ?)',
      [team.id, team.name, team.flag, team.primaryColor, team.secondaryColor, team.jerseyColor]
    );
  }

  console.log('Database initialized successfully with default teams and settings.');
};

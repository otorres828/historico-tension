import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import type { PressureDay, ReadingInput, Slot } from "./types";
const dbPath = path.resolve(
  /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
    path.join(process.cwd(), "data", "tensiometro.db"),
);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const SQL = await initSqlJs({
  locateFile: (file) =>
    path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
});
const db = fs.existsSync(/* turbopackIgnore: true */ dbPath)
  ? new SQL.Database(fs.readFileSync(/* turbopackIgnore: true */ dbPath))
  : new SQL.Database();
db.run(
  `PRAGMA foreign_keys=ON;CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL COLLATE NOCASE,password TEXT NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS blood_pressures(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,date TEXT NOT NULL,left_arm_morning_sys INTEGER,left_arm_morning_dia INTEGER,left_arm_morning_time TEXT,right_arm_morning_sys INTEGER,right_arm_morning_dia INTEGER,right_arm_morning_time TEXT,left_arm_afternoon_sys INTEGER,left_arm_afternoon_dia INTEGER,left_arm_afternoon_time TEXT,right_arm_afternoon_sys INTEGER,right_arm_afternoon_dia INTEGER,right_arm_afternoon_time TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,UNIQUE(user_id,date));CREATE INDEX IF NOT EXISTS idx_blood_pressures_user_date ON blood_pressures(user_id,date);`,
);
persist();
function persist() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}
type Params = Array<string | number | null>;
function rows(sql: string, params: Params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out: Record<string, unknown>[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}
function run(sql: string, params: Params = []) {
  db.run(sql, params);
  const changed = Number(rows("SELECT changes() AS n")[0]?.n || 0);
  persist();
  return changed;
}
export type UserRow = {
  id: number;
  name: string;
  email: string;
  password: string;
};
export function findUserByEmail(email: string) {
  return rows("SELECT id,name,email,password FROM users WHERE email=?", [
    email,
  ])[0] as UserRow | undefined;
}
export function findUserById(id: number) {
  return rows("SELECT id,name,email,password FROM users WHERE id=?", [
    id,
  ])[0] as UserRow | undefined;
}
export function createUser(name: string, email: string, password: string) {
  db.run("INSERT INTO users(name,email,password) VALUES(?,?,?)", [
    name,
    email,
    password,
  ]);
  const id = Number(rows("SELECT last_insert_rowid() AS id")[0].id);
  persist();
  return id;
}
type PressureRow = Record<string, unknown> & { date: string };
function slot(row: PressureRow, p: string): Slot {
  const sys = row[`${p}_sys`],
    dia = row[`${p}_dia`],
    time = row[`${p}_time`];
  return typeof sys === "number" &&
    typeof dia === "number" &&
    typeof time === "string"
    ? { sys, dia, time }
    : null;
}
export function listPressures(
  userId: number,
  from?: string,
  to?: string,
): PressureDay[] {
  const clauses = ["user_id=?"],
    params: Params = [userId];
  if (from) {
    clauses.push("date>=?");
    params.push(from);
  }
  if (to) {
    clauses.push("date<=?");
    params.push(to);
  }
  return (
    rows(
      `SELECT * FROM blood_pressures WHERE ${clauses.join(" AND ")} ORDER BY date DESC`,
      params,
    ) as PressureRow[]
  ).map((r) => ({
    date: r.date,
    morning: {
      left_arm: slot(r, "left_arm_morning"),
      right_arm: slot(r, "right_arm_morning"),
    },
    afternoon: {
      left_arm: slot(r, "left_arm_afternoon"),
      right_arm: slot(r, "right_arm_afternoon"),
    },
  }));
}
export function saveReading(userId: number, r: ReadingInput) {
  const p = `${r.arm}_${r.shift}`;
  run(
    `INSERT INTO blood_pressures(user_id,date,${p}_sys,${p}_dia,${p}_time) VALUES(?,?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET ${p}_sys=excluded.${p}_sys,${p}_dia=excluded.${p}_dia,${p}_time=excluded.${p}_time,updated_at=CURRENT_TIMESTAMP`,
    [userId, r.date, r.systolic, r.diastolic, r.time],
  );
}
export function deleteReading(
  userId: number,
  date: string,
  shift: ReadingInput["shift"],
  arm: ReadingInput["arm"],
) {
  const p = `${arm}_${shift}`;
  const changed = run(
    `UPDATE blood_pressures SET ${p}_sys=NULL,${p}_dia=NULL,${p}_time=NULL,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND date=?`,
    [userId, date],
  );
  run(
    `DELETE FROM blood_pressures WHERE user_id=? AND date=? AND left_arm_morning_sys IS NULL AND right_arm_morning_sys IS NULL AND left_arm_afternoon_sys IS NULL AND right_arm_afternoon_sys IS NULL`,
    [userId, date],
  );
  return changed > 0;
}

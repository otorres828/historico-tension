import { createClient, type InValue, type Row } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

import type { PressureDay, ReadingInput, Slot } from "./types";

const remoteUrl = process.env.TURSO_DATABASE_URL;
const localPath = path.resolve(
  process.env.DATABASE_PATH ||
    path.join(process.cwd(), "data", "tensiometro.db"),
);

if (!remoteUrl) {
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
}

const db = createClient({
  url: remoteUrl || `file:${localPath}`,
  authToken: remoteUrl ? process.env.TURSO_AUTH_TOKEN : undefined,
});

const schemaReady = db.batch(
  [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS blood_pressures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      left_arm_morning_sys INTEGER,
      left_arm_morning_dia INTEGER,
      left_arm_morning_time TEXT,
      right_arm_morning_sys INTEGER,
      right_arm_morning_dia INTEGER,
      right_arm_morning_time TEXT,
      left_arm_afternoon_sys INTEGER,
      left_arm_afternoon_dia INTEGER,
      left_arm_afternoon_time TEXT,
      right_arm_afternoon_sys INTEGER,
      right_arm_afternoon_dia INTEGER,
      right_arm_afternoon_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_blood_pressures_user_date
      ON blood_pressures(user_id, date)`,
  ],
  "write",
);

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password: string;
};

export async function findUserByEmail(email: string) {
  await schemaReady;

  const result = await db.execute({
    sql: "SELECT id, name, email, password FROM users WHERE email = ?",
    args: [email],
  });

  return result.rows[0] as UserRow | undefined;
}

export async function findUserById(id: number) {
  await schemaReady;

  const result = await db.execute({
    sql: "SELECT id, name, email, password FROM users WHERE id = ?",
    args: [id],
  });

  return result.rows[0] as UserRow | undefined;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
) {
  await schemaReady;

  const result = await db.execute({
    sql: "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    args: [name, email, password],
  });

  return Number(result.lastInsertRowid);
}

export async function listPressures(
  userId: number,
  from?: string,
  to?: string,
): Promise<PressureDay[]> {
  await schemaReady;

  const clauses = ["user_id = ?"];
  const args: InValue[] = [userId];

  if (from) {
    clauses.push("date >= ?");
    args.push(from);
  }

  if (to) {
    clauses.push("date <= ?");
    args.push(to);
  }

  const result = await db.execute({
    sql: `SELECT * FROM blood_pressures
      WHERE ${clauses.join(" AND ")}
      ORDER BY date DESC`,
    args,
  });

  return result.rows.map(toPressureDay);
}

export async function saveReading(userId: number, reading: ReadingInput) {
  await schemaReady;

  const prefix = `${reading.arm}_${reading.shift}`;

  await db.execute({
    sql: `INSERT INTO blood_pressures (
      user_id, date, ${prefix}_sys, ${prefix}_dia, ${prefix}_time
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      ${prefix}_sys = excluded.${prefix}_sys,
      ${prefix}_dia = excluded.${prefix}_dia,
      ${prefix}_time = excluded.${prefix}_time,
      updated_at = CURRENT_TIMESTAMP`,
    args: [
      userId,
      reading.date,
      reading.systolic,
      reading.diastolic,
      reading.time,
    ],
  });
}

export async function deleteReading(
  userId: number,
  date: string,
  shift: ReadingInput["shift"],
  arm: ReadingInput["arm"],
) {
  await schemaReady;

  const prefix = `${arm}_${shift}`;
  const update = await db.execute({
    sql: `UPDATE blood_pressures SET
      ${prefix}_sys = NULL,
      ${prefix}_dia = NULL,
      ${prefix}_time = NULL,
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND date = ?`,
    args: [userId, date],
  });

  await db.execute({
    sql: `DELETE FROM blood_pressures
      WHERE user_id = ? AND date = ?
      AND left_arm_morning_sys IS NULL
      AND right_arm_morning_sys IS NULL
      AND left_arm_afternoon_sys IS NULL
      AND right_arm_afternoon_sys IS NULL`,
    args: [userId, date],
  });

  return update.rowsAffected > 0;
}

function toPressureDay(row: Row): PressureDay {
  return {
    date: String(row.date),
    morning: {
      left_arm: toSlot(row, "left_arm_morning"),
      right_arm: toSlot(row, "right_arm_morning"),
    },
    afternoon: {
      left_arm: toSlot(row, "left_arm_afternoon"),
      right_arm: toSlot(row, "right_arm_afternoon"),
    },
  };
}

function toSlot(row: Row, prefix: string): Slot {
  const sys = row[`${prefix}_sys`];
  const dia = row[`${prefix}_dia`];
  const time = row[`${prefix}_time`];

  if (typeof sys !== "number" || typeof dia !== "number" || !time) {
    return null;
  }

  return {
    sys,
    dia,
    time: String(time),
  };
}

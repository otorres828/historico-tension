import { createClient, type InValue, type Row } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

import type { PressureDay, ReadingInput, Slot } from "./types";

const remoteUrl = process.env.TURSO_DATABASE_URL;
const localPath = path.resolve(
  /* turbopackIgnore: true */
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

const pulseColumns = [
  "left_arm_morning_pulse",
  "right_arm_morning_pulse",
  "left_arm_afternoon_pulse",
  "right_arm_afternoon_pulse",
] as const;

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  schemaReady ??= initializeSchema();
  return schemaReady;
}

async function initializeSchema() {
  await db.batch(
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
      left_arm_morning_pulse INTEGER,
      right_arm_morning_sys INTEGER,
      right_arm_morning_dia INTEGER,
      right_arm_morning_time TEXT,
      right_arm_morning_pulse INTEGER,
      left_arm_afternoon_sys INTEGER,
      left_arm_afternoon_dia INTEGER,
      left_arm_afternoon_time TEXT,
      left_arm_afternoon_pulse INTEGER,
      right_arm_afternoon_sys INTEGER,
      right_arm_afternoon_dia INTEGER,
      right_arm_afternoon_time TEXT,
      right_arm_afternoon_pulse INTEGER,
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

  const tableInfo = await db.execute("PRAGMA table_info(blood_pressures)");
  const existingColumns = new Set(
    tableInfo.rows.map((row) => String(row.name)),
  );

  for (const column of pulseColumns) {
    if (!existingColumns.has(column)) {
      await db.execute(
        `ALTER TABLE blood_pressures ADD COLUMN ${column} INTEGER`,
      );
    }
  }
}

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password: string;
};

export async function findUserByEmail(email: string) {
  await ensureSchema();

  const result = await db.execute({
    sql: "SELECT id, name, email, password FROM users WHERE email = ?",
    args: [email],
  });

  return toUser(result.rows[0]);
}

export async function findUserById(id: number) {
  await ensureSchema();

  const result = await db.execute({
    sql: "SELECT id, name, email, password FROM users WHERE id = ?",
    args: [id],
  });

  return toUser(result.rows[0]);
}

export async function createUser(
  name: string,
  email: string,
  password: string,
) {
  await ensureSchema();

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
  await ensureSchema();

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
  await ensureSchema();

  const prefix = `${reading.arm}_${reading.shift}`;

  await db.execute({
    sql: `INSERT INTO blood_pressures (
      user_id, date, ${prefix}_sys, ${prefix}_dia, ${prefix}_time, ${prefix}_pulse
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      ${prefix}_sys = excluded.${prefix}_sys,
      ${prefix}_dia = excluded.${prefix}_dia,
      ${prefix}_time = excluded.${prefix}_time,
      ${prefix}_pulse = excluded.${prefix}_pulse,
      updated_at = CURRENT_TIMESTAMP`,
    args: [
      userId,
      reading.date,
      reading.systolic,
      reading.diastolic,
      reading.time,
      reading.pulse,
    ],
  });
}

export async function deleteReading(
  userId: number,
  date: string,
  shift: ReadingInput["shift"],
  arm: ReadingInput["arm"],
) {
  await ensureSchema();

  const prefix = `${arm}_${shift}`;
  const update = await db.execute({
    sql: `UPDATE blood_pressures SET
      ${prefix}_sys = NULL,
      ${prefix}_dia = NULL,
      ${prefix}_time = NULL,
      ${prefix}_pulse = NULL,
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

function toUser(row: Row | undefined): UserRow | undefined {
  if (!row) {
    return undefined;
  }

  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    password: String(row.password),
  };
}

function toSlot(row: Row, prefix: string): Slot {
  const sys = row[`${prefix}_sys`];
  const dia = row[`${prefix}_dia`];
  const time = row[`${prefix}_time`];
  const pulse = row[`${prefix}_pulse`];

  if (typeof sys !== "number" || typeof dia !== "number" || !time) {
    return null;
  }

  return {
    sys,
    dia,
    pulse: typeof pulse === "number" ? pulse : null,
    time: String(time),
  };
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { deleteReading, listPressures, saveReading } from "@/lib/db";
import type { ReadingInput } from "@/lib/types";
import { validateReading, validDateFilter } from "@/lib/validation";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class PressureController {
  static async index(request: Request) {
    const user = await getCurrentUser();

    if (!user) {
      return PressureController.unauthorized();
    }

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (
      !validDateFilter(from) ||
      !validDateFilter(to) ||
      (from && to && from > to)
    ) {
      return NextResponse.json(
        { error: "El rango de fechas no es válido." },
        { status: 400 },
      );
    }

    const pressures = listPressures(
      user.id,
      from || undefined,
      to || undefined,
    );

    return NextResponse.json(pressures);
  }

  static async store(request: Request) {
    const user = await getCurrentUser();

    if (!user) {
      return PressureController.unauthorized();
    }

    const body = await request.json().catch(() => null);
    const result = validateReading(body);

    if (!result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    saveReading(user.id, result.data);

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  static async destroy(request: Request) {
    const user = await getCurrentUser();

    if (!user) {
      return PressureController.unauthorized();
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const shift = url.searchParams.get("shift");
    const arm = url.searchParams.get("arm");

    const parameters = PressureController.parseDeleteParameters(
      date,
      shift,
      arm,
    );

    if (!parameters) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const deleted = deleteReading(
      user.id,
      parameters.date,
      parameters.shift,
      parameters.arm,
    );

    return NextResponse.json({ ok: deleted });
  }

  private static unauthorized() {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  private static parseDeleteParameters(
    date: string | null,
    shift: string | null,
    arm: string | null,
  ): Pick<ReadingInput, "date" | "shift" | "arm"> | null {
    const valid = Boolean(
      date &&
      datePattern.test(date) &&
      (shift === "morning" || shift === "afternoon") &&
      (arm === "left_arm" || arm === "right_arm"),
    );

    if (!valid) {
      return null;
    }

    return {
      date: date as string,
      shift: shift as ReadingInput["shift"],
      arm: arm as ReadingInput["arm"],
    };
  }
}

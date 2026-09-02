import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createSession, destroySession } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";

type AuthBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

export class AuthController {
  static async register(request: Request) {
    try {
      const body = (await request.json()) as AuthBody;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (name.length < 2 || name.length > 80) {
        return NextResponse.json(
          { error: "Ingresa un nombre válido." },
          { status: 400 },
        );
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Ingresa un correo válido." },
          { status: 400 },
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 8 caracteres." },
          { status: 400 },
        );
      }

      if (await findUserByEmail(email)) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con ese correo." },
          { status: 409 },
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = await createUser(name, email, hashedPassword);
      await createSession(userId);

      return NextResponse.json({ ok: true }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "No fue posible crear la cuenta." },
        { status: 500 },
      );
    }
  }

  static async login(request: Request) {
    try {
      const body = (await request.json()) as AuthBody;
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const user = await findUserByEmail(email);
      const validPassword =
        user && (await bcrypt.compare(password, user.password));

      if (!user || !validPassword) {
        return NextResponse.json(
          { error: "Correo o contraseña incorrectos." },
          { status: 401 },
        );
      }

      await createSession(user.id);

      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { error: "No fue posible iniciar sesión." },
        { status: 500 },
      );
    }
  }

  static async logout() {
    await destroySession();

    return NextResponse.json({ ok: true });
  }
}

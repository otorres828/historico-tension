"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export default function AuthScreen() {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${register ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error || "Ocurrió un error.");
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 px-5 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/70 border border-slate-100">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-teal-600 text-3xl text-white shadow-lg shadow-teal-200">
            ♥
          </div>
          <h1 className="text-3xl font-bold text-slate-900">TensioCare</h1>
          <p className="mt-2 text-slate-500">
            Tu presión, clara y bajo control.
          </p>
        </div>
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setRegister(false)}
            className={`focus-ring rounded-lg py-2.5 font-semibold ${!register ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setRegister(true)}
            className={`focus-ring rounded-lg py-2.5 font-semibold ${register ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
          >
            Crear cuenta
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {register && (
            <label className="block text-sm font-semibold text-slate-700">
              Nombre
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
                placeholder="Tu nombre"
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-700">
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
              placeholder="nombre@correo.com"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={8}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
              placeholder="Mínimo 8 caracteres"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="focus-ring w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white shadow-md shadow-teal-200 transition hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? "Procesando…" : register ? "Crear mi cuenta" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Tus mediciones se guardan de forma privada y separada por cuenta.
        </p>
      </section>
    </main>
  );
}

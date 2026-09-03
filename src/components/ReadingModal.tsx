"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { ReadingInput } from "@/lib/types";
function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export default function ReadingModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ReadingInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/pressures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error);
    onSaved();
  }
  const field =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-none focus:border-teal-500";
  return (
    <div
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
              Medición
            </p>
            <h2
              id="modal-title"
              className="mt-1 text-2xl font-bold text-slate-900"
            >
              {initial ? "Editar toma" : "Nueva toma"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-xl text-slate-500"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <label className="col-span-2 text-sm font-semibold text-slate-700">
            Fecha
            <input
              name="date"
              type="date"
              required
              defaultValue={initial?.date || localDate()}
              className={field}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Turno
            <select
              name="shift"
              defaultValue={initial?.shift || "morning"}
              className={field}
            >
              <option value="morning">Mañana</option>
              <option value="afternoon">Tarde</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Brazo
            <select
              name="arm"
              defaultValue={initial?.arm || "left_arm"}
              className={field}
            >
              <option value="left_arm">Izquierdo</option>
              <option value="right_arm">Derecho</option>
            </select>
          </label>
          <label className="col-span-2 text-sm font-semibold text-slate-700">
            Hora
            <input
              name="time"
              type="time"
              required
              defaultValue={
                initial?.time || new Date().toTimeString().slice(0, 5)
              }
              className={field}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Sistólica <span className="font-normal text-slate-400">(alta)</span>
            <input
              name="systolic"
              type="number"
              min={50}
              max={300}
              required
              defaultValue={initial?.systolic || 120}
              inputMode="numeric"
              className={field}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Diastólica{" "}
            <span className="font-normal text-slate-400">(baja)</span>
            <input
              name="diastolic"
              type="number"
              min={30}
              max={200}
              required
              defaultValue={initial?.diastolic || 80}
              inputMode="numeric"
              className={field}
            />
          </label>
          <label className="col-span-2 text-sm font-semibold text-slate-700">
            Pulsaciones{" "}
            <span className="font-normal text-slate-400">(por minuto)</span>
            <input
              name="pulse"
              type="number"
              min={30}
              max={250}
              required
              defaultValue={initial?.pulse || 70}
              inputMode="numeric"
              className={field}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <div className="col-span-2 mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white shadow-md shadow-teal-200 disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Guardar toma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

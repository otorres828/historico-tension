"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaTrash } from "react-icons/fa";
import type { PressureDay, ReadingInput, Slot } from "@/lib/types";
import ReadingModal from "./ReadingModal";
type Props = { user: { id: number; name: string; email: string } };
const labels = {
  morning: "Mañana",
  afternoon: "Tarde",
  left_arm: "Brazo izquierdo",
  right_arm: "Brazo derecho",
};
function displayDate(v: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${v}T00:00:00Z`));
}
function displayTime(v: string) {
  const [h, m] = v.split(":").map(Number);
  return new Intl.DateTimeFormat("es-GT", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, h, m));
}

function formatExportSlot(slot: Slot) {
  return slot
    ? `${slot.sys}/${slot.dia} · ${slot.pulse ?? "--"} ppm · ${slot.time}`
    : "";
}

export default function Dashboard({ user }: Props) {
  const [rows, setRows] = useState<PressureDay[]>([]),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState<"PDF" | "Excel" | null>(null),
    [modal, setModal] = useState<ReadingInput | null | "new">(null);
  const router = useRouter();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const res = await fetch(`/api/pressures?${p}`),
      json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error);
    setRows(json);
  }, [from, to]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  function edit(
    date: string,
    shift: ReadingInput["shift"],
    arm: ReadingInput["arm"],
    value: Slot,
  ) {
    setModal(
      value
        ? {
            date,
            shift,
            arm,
            time: value.time,
            systolic: value.sys,
            diastolic: value.dia,
            pulse: value.pulse || 70,
          }
        : {
            date,
            shift,
            arm,
            time: new Date().toTimeString().slice(0, 5),
            systolic: 120,
            diastolic: 80,
            pulse: 70,
          },
    );
  }
  async function remove(
    date: string,
    shift: ReadingInput["shift"],
    arm: ReadingInput["arm"],
  ) {
    if (!confirm("¿Eliminar esta medición?")) return;
    await fetch(`/api/pressures?${new URLSearchParams({ date, shift, arm })}`, {
      method: "DELETE",
    });
    void load();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  async function exportPdf() {
    setExporting("PDF");

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(18);
      doc.text("Historial de presión arterial", 14, 16);
      const body = rows.map((r) => [
        displayDate(r.date),
        ...(
          [
            r.morning.left_arm,
            r.morning.right_arm,
            r.afternoon.left_arm,
            r.afternoon.right_arm,
          ] as Slot[]
        ).map((s) =>
          s ? `${s.sys}/${s.dia} · ${s.pulse ?? "--"} ppm · ${s.time}` : "--",
        ),
      ]);
      autoTableModule.default(doc, {
        startY: 22,
        head: [
          [
            "Fecha",
            "Mañana · Izq.",
            "Mañana · Der.",
            "Tarde · Izq.",
            "Tarde · Der.",
          ],
        ],
        body,
        headStyles: { fillColor: [13, 148, 136] },
      });
      doc.save("historial-presion.pdf");
    } finally {
      setExporting(null);
    }
  }
  async function exportExcel() {
    setExporting("Excel");

    try {
      const ExcelJS = (await import("exceljs")).default;
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet("Presiones");
      sheet.columns = [
        { header: "Fecha", key: "date", width: 14 },
        { header: "Mañana - Brazo izquierdo", key: "mil", width: 32 },
        { header: "Mañana - Brazo derecho", key: "mir", width: 32 },
        { header: "Tarde - Brazo izquierdo", key: "ail", width: 32 },
        { header: "Tarde - Brazo derecho", key: "air", width: 32 },
      ];
      rows.forEach((r) =>
        sheet.addRow({
          date: r.date,
          mil: formatExportSlot(r.morning.left_arm),
          mir: formatExportSlot(r.morning.right_arm),
          ail: formatExportSlot(r.afternoon.left_arm),
          air: formatExportSlot(r.afternoon.right_arm),
        }),
      );
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D9488" },
      };
      const buffer = await book.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "historial-presion.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-teal-600 text-xl text-white">
              ♥
            </div>
            <div>
              <h1 className="font-bold text-slate-900">TensioCare</h1>
              <p className="text-xs text-slate-500">Hola, {user.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Salir
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
              Seguimiento
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Historial de mediciones
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registra y consulta tu presión en un solo lugar.
            </p>
          </div>
          <button
            onClick={() => setModal("new")}
            className="focus-ring rounded-xl bg-teal-600 px-5 py-3 font-bold text-white shadow-md shadow-teal-200 hover:bg-teal-700"
          >
            ＋ Nueva toma
          </button>
        </div>
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
              />
            </label>
            <button
              onClick={load}
              className="col-span-2 self-end rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 lg:col-span-1"
            >
              Filtrar
            </button>
            <button
              onClick={exportPdf}
              disabled={!rows.length || Boolean(exporting)}
              className="self-end rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-40"
            >
              PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={!rows.length || Boolean(exporting)}
              className="self-end rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 disabled:opacity-40"
            >
              Excel
            </button>
          </div>
          {from && to && from > to && (
            <p className="mt-3 text-sm text-red-600">
              La fecha inicial no puede ser posterior a la final.
            </p>
          )}
        </section>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th
                    rowSpan={2}
                    className="border-r border-slate-700 px-5 py-4"
                  >
                    Fecha
                  </th>
                  <th
                    colSpan={2}
                    className="border-r border-slate-700 px-4 py-2 text-center text-xs uppercase tracking-wider"
                  >
                    Mañana
                  </th>
                  <th
                    colSpan={2}
                    className="px-4 py-2 text-center text-xs uppercase tracking-wider"
                  >
                    Tarde
                  </th>
                </tr>
                <tr className="bg-slate-700 text-xs text-slate-200">
                  <th className="px-4 py-2">Brazo izquierdo</th>
                  <th className="border-r border-slate-600 px-4 py-2">
                    Brazo derecho
                  </th>
                  <th className="px-4 py-2">Brazo izquierdo</th>
                  <th className="px-4 py-2">Brazo derecho</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      Cargando mediciones…
                    </td>
                  </tr>
                ) : !rows.length ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="text-4xl">♡</div>
                      <p className="mt-3 font-bold text-slate-700">
                        Aún no hay mediciones
                      </p>
                      <p className="text-sm text-slate-400">
                        Añade tu primera toma para comenzar.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.date}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="border-r border-slate-100 px-5 py-4 font-bold text-slate-800">
                        {displayDate(row.date)}
                      </td>
                      {(
                        [
                          ["morning", "left_arm", row.morning.left_arm],
                          ["morning", "right_arm", row.morning.right_arm],
                          ["afternoon", "left_arm", row.afternoon.left_arm],
                          ["afternoon", "right_arm", row.afternoon.right_arm],
                        ] as const
                      ).map(([shift, arm, value], i) => (
                        <td
                          key={`${shift}-${arm}`}
                          className={`px-4 py-4 ${i === 1 ? "border-r border-slate-100" : ""}`}
                        >
                          {value ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-slate-50">
                              <div>
                                <span className="block text-lg font-bold text-slate-900">
                                  <span className="text-teal-600">
                                    {value.sys}
                                  </span>{" "}
                                  / {value.dia}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {displayTime(value.time)}
                                </span>
                                <span className="mt-1 block text-xs font-semibold text-rose-500">
                                  ♥ {value.pulse ?? "--"} ppm
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    edit(row.date, shift, arm, value)
                                  }
                                  aria-label={`Editar ${labels[shift]} ${labels[arm]}`}
                                  title="Editar"
                                  className="focus-ring grid size-9 place-items-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <FaEdit aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => remove(row.date, shift, arm)}
                                  aria-label={`Eliminar ${labels[shift]} ${labels[arm]}`}
                                  title="Eliminar"
                                  className="focus-ring grid size-9 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 hover:text-red-700"
                                >
                                  <FaTrash aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => edit(row.date, shift, arm, value)}
                              className="group w-full rounded-lg p-2 text-left hover:bg-teal-50"
                            >
                              <span className="text-sm text-slate-300 group-hover:text-teal-500">
                                ＋ Agregar
                              </span>
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <p className="mt-3 text-center text-xs text-slate-400 sm:hidden">
          Desliza horizontalmente para ver toda la tabla.
        </p>
      </div>
      {modal && (
        <ReadingModal
          initial={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void load();
          }}
        />
      )}
      {exporting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 px-6 backdrop-blur-sm"
        >
          <div className="flex min-w-56 flex-col items-center rounded-2xl bg-white px-8 py-7 text-center shadow-2xl">
            <div className="size-12 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
            <p className="mt-4 font-bold text-slate-800">
              Generando {exporting}…
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tu descarga estará lista en un momento.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

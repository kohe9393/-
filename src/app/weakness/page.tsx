import { WeaknessReport } from "@/components/WeaknessReport";

export const metadata = { title: "弱点 — Script Flow" };

export default function WeaknessPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">弱点</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        教材をまたいで、つまずいた箇所とその解説をまとめて振り返れます。
      </p>
      <div className="mt-7">
        <WeaknessReport />
      </div>
    </div>
  );
}

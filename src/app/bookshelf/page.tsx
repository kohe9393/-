import { Bookshelf } from "@/components/Bookshelf";

export const metadata = { title: "本棚 — Script Flow" };

export default function BookshelfPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">本棚</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        つくった教材はこのブラウザに保存されます。
      </p>
      <div className="mt-7">
        <Bookshelf />
      </div>
    </div>
  );
}

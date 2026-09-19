import { CreateFlow } from "@/components/CreateFlow";
import { SampleShelf } from "@/components/SampleShelf";
import { hasApiKey } from "@/lib/claude";
import { Notice } from "@/components/ui";

const STEPS = [
  {
    n: "01",
    title: "貼る",
    body: "英文スクリプトを貼り付けるか、教科書やプリントの写真をアップロードします。",
  },
  {
    n: "02",
    title: "できる",
    body: "英日対訳・重要単語・パート分割が自動で付きます。英文そのものは書き換えません。",
  },
  {
    n: "03",
    title: "読む・印を付ける",
    body: "文ごとに音声を再生して音読。分からない箇所は選んで印を付けると、その場でAIが解説します。",
  },
];

export default function HomePage() {
  const aiEnabled = hasApiKey();

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <section className="mb-9 text-center">
        <p className="mb-3 text-xs font-medium tracking-widest text-brand-600 uppercase dark:text-brand-400">
          Script Flow
        </p>
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          英文を貼るだけで、
          <br className="sm:hidden" />
          音声つき音読教材に。
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[var(--text-muted)]">
          対訳・単語帳・弱点診断まで、ひとつの流れで。
          <br />
          手持ちの英文が、そのまま自分専用の教材になります。
        </p>
      </section>

      {!aiEnabled && (
        <div className="mb-6">
          <Notice tone="warn">
            <strong className="font-medium">ANTHROPIC_API_KEY が未設定です。</strong>{" "}
            サンプル教材と音読機能はこのまま使えます。対訳・単語・AI解説・写真の読み取りを使うには、
            <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
              .env.local
            </code>
            にキーを設定して開発サーバーを再起動してください。
          </Notice>
        </div>
      )}

      <CreateFlow aiEnabled={aiEnabled} />

      <section className="mt-14">
        <h2 className="mb-5 text-lg font-semibold tracking-tight">使い方は3ステップ</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <span className="text-xs font-semibold tracking-widest text-brand-600 dark:text-brand-400">
                {step.n}
              </span>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            サンプル教材から試す
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            共通テスト・英検2級・TOEIC・TOEFL
          </p>
        </div>
        <SampleShelf />
      </section>
    </div>
  );
}

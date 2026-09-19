import { buildMaterial, type RawPart, type RawVocab } from "./material";
import type { LevelKey, Material } from "./types";

/** 英文と訳を 1 文ずつ組にして持つ。段落は配列の配列。 */
type Pair = [en: string, ja: string];

interface SampleSource {
  id: string;
  title: string;
  titleJa: string;
  summary: string;
  level: LevelKey;
  tags: string[];
  /** 何日前に作られたことにするか（本棚の並び順用） */
  daysAgo: number;
  paragraphs: Pair[][];
  parts: RawPart[];
  vocab: RawVocab[];
}

const SOURCES: SampleSource[] = [
  {
    id: "sample_finding_her_voice",
    title: "Finding Her Voice",
    titleJa: "自分の声を見つけるまで",
    summary:
      "人前で話すのが苦手だった高校生ミナが、放送部の原稿読みをきっかけに、自分の声で話すことを覚えていく話。高校生活と成長がテーマの、共通テストに近い長さと語彙。",
    level: "kyotsu",
    tags: ["高校生活", "成長", "スピーチ"],
    daysAgo: 4,
    paragraphs: [
      [
        [
          "Mina had spent three years in the back row, and she liked it there.",
          "ミナは三年間、教室のいちばん後ろの席で過ごしてきた。そして、その場所が気に入っていた。",
        ],
        [
          "From the back, you could see everything without being seen.",
          "後ろからなら、自分は見られずにすべてを見ていられる。",
        ],
        [
          "When her teacher asked for volunteers to read the morning announcements, Mina looked down at her desk.",
          "先生が朝の放送を読む人はいないかと聞いたとき、ミナは机に目を落とした。",
        ],
        [
          "She had always believed her voice was too small to matter.",
          "自分の声なんて小さすぎて意味がない、とずっと思っていたのだ。",
        ],
      ],
      [
        [
          "Then, one Tuesday in October, the usual announcer caught a cold.",
          "ところが十月のある火曜日、いつものアナウンサー役が風邪をひいた。",
        ],
        [
          "The teacher handed Mina the script without asking, as if the matter had already been settled.",
          "先生は何も聞かずにミナへ原稿を渡した。もう決まったことだとでもいうように。",
        ],
        [
          "Her hands shook so badly that the paper rattled against the microphone.",
          "手がひどく震えて、紙がマイクに当たってかさかさと鳴った。",
        ],
        [
          "She read the first line, then the second, and somewhere near the bottom of the page she forgot to be afraid.",
          "一行目を読み、二行目を読み、ページの終わりに近づいたどこかで、怖がることを忘れていた。",
        ],
      ],
      [
        [
          "Nobody applauded, because that is not what happens after morning announcements.",
          "拍手は起きなかった。朝の放送のあとに拍手が起きることなどないからだ。",
        ],
        [
          "But a boy she had never spoken to said her voice was easy to listen to.",
          "けれど、話したこともない男子が、ミナの声は聞きやすいと言った。",
        ],
        [
          "Mina thought about that sentence for the rest of the week.",
          "ミナはその一言を、その週のあいだずっと考えていた。",
        ],
        [
          "By November she had stopped sitting in the back row, not because she had become brave, but because she had run out of reasons to hide.",
          "十一月になるころ、ミナは後ろの席に座るのをやめていた。勇敢になったからではない。隠れている理由がなくなったからだった。",
        ],
      ],
    ],
    parts: [
      { startSentence: 1, endSentence: 4, title: "後ろの席が好きだった", summary: "目立たない場所を選んでいたミナの、これまでの自己像。" },
      { startSentence: 5, endSentence: 8, title: "突然まわってきた原稿", summary: "代役として放送を読むことになり、震えながら読み切る。" },
      { startSentence: 9, endSentence: 12, title: "拍手のない変化", summary: "劇的な出来事はないまま、座る場所が変わっていく。" },
    ],
    vocab: [
      { word: "the back row", pos: "熟語", meaning: "（教室の）いちばん後ろの列", sentenceNumber: 1 },
      { word: "volunteers", phonetic: "/ˌvɑːlənˈtɪrz/", pos: "名詞", meaning: "自分から引き受ける人、志願者", sentenceNumber: 3 },
      { word: "announcements", phonetic: "/əˈnaʊnsmənts/", pos: "名詞", meaning: "お知らせ、連絡事項", sentenceNumber: 3 },
      { word: "matter", phonetic: "/ˈmætər/", pos: "動詞", meaning: "重要である、意味がある", sentenceNumber: 4 },
      { word: "as if", pos: "熟語", meaning: "まるで〜であるかのように", sentenceNumber: 6 },
      { word: "settled", phonetic: "/ˈsetld/", pos: "動詞", meaning: "決着がついた、片づいた", sentenceNumber: 6 },
      { word: "rattled", phonetic: "/ˈrætld/", pos: "動詞", meaning: "かたかたと音を立てた", sentenceNumber: 7 },
      { word: "applauded", phonetic: "/əˈplɔːdɪd/", pos: "動詞", meaning: "拍手した", sentenceNumber: 9 },
      { word: "easy to listen to", pos: "熟語", meaning: "聞きやすい（to 不定詞が easy を説明する形）", sentenceNumber: 10 },
      { word: "run out of", pos: "熟語", meaning: "〜を使い果たす、〜がなくなる", sentenceNumber: 12 },
    ],
  },
  {
    id: "sample_words_that_wouldnt_come",
    title: "The Words That Wouldn't Come",
    titleJa: "出てこなかった言葉",
    summary:
      "留学一週目、頭の中にある英語が口から出てこないケンタの話。異文化のなかで、正しさより伝えることを優先できるようになるまで。英検2級前後の語彙。",
    level: "eiken2",
    tags: ["留学", "異文化", "コミュニケーション"],
    daysAgo: 9,
    paragraphs: [
      [
        [
          "Kenta had studied English for six years, and he could explain the present perfect better than most of his classmates.",
          "ケンタは六年間英語を勉強してきたし、現在完了の説明ならクラスの誰よりうまくできた。",
        ],
        [
          "On his first morning in Portland, none of that helped.",
          "けれどポートランドでの最初の朝、そのどれも役に立たなかった。",
        ],
        [
          "His host mother asked a simple question, and he heard every word except the one that mattered.",
          "ホストマザーが簡単な質問をしたが、肝心の一語だけが聞き取れなかった。",
        ],
        [
          "He smiled and said yes, which turned out to be the wrong answer.",
          "彼はほほえんで「はい」と答えた。それが間違った答えだった。",
        ],
      ],
      [
        [
          "For the next three days, Kenta rehearsed sentences in his head before saying them out loud.",
          "それから三日間、ケンタは口に出す前に頭の中で文を組み立てるようになった。",
        ],
        [
          "By the time each sentence was perfect, the conversation had already moved on.",
          "文が完璧になるころには、会話はとっくに先へ進んでいた。",
        ],
        [
          "He began to suspect that accuracy was costing him more than mistakes ever would.",
          "正確さのために払っている代償のほうが、間違いよりずっと大きいのではないか。そう疑いはじめた。",
        ],
      ],
      [
        [
          "On Friday, his host brother spilled juice across the kitchen table.",
          "金曜日、ホストブラザーがキッチンのテーブルにジュースをこぼした。",
        ],
        [
          "Without thinking, Kenta shouted, \"Towel! There, behind you!\"",
          "考える間もなく、ケンタは叫んでいた。「タオル! そこ、後ろ!」",
        ],
        [
          "It was not a complete sentence, and he did not care.",
          "完全な文ではなかったが、そんなことはどうでもよかった。",
        ],
        [
          "For the first time that week, someone had understood him immediately.",
          "その週で初めて、誰かが即座に自分の言葉を理解してくれたのだ。",
        ],
        [
          "Language, he realized, was not a test he had to pass but a road he had to cross.",
          "言葉とは、合格しなければならない試験ではなく、渡らなければならない道なのだ。ケンタはそう気づいた。",
        ],
      ],
    ],
    parts: [
      { startSentence: 1, endSentence: 4, title: "勉強と現実のずれ", summary: "文法は分かるのに、最初の会話でつまずく。" },
      { startSentence: 5, endSentence: 7, title: "完璧さという足かせ", summary: "頭で組み立てているうちに会話が過ぎていく。" },
      { startSentence: 8, endSentence: 12, title: "通じた瞬間", summary: "不完全な英語が初めてまっすぐ伝わる。" },
    ],
    vocab: [
      { word: "the present perfect", pos: "名詞", meaning: "現在完了（時制の名前）", sentenceNumber: 1 },
      { word: "host mother", pos: "名詞", meaning: "ホームステイ先の母親", sentenceNumber: 3 },
      { word: "the one that mattered", pos: "熟語", meaning: "肝心なもの（the one = the word）", sentenceNumber: 3 },
      { word: "turned out to be", pos: "熟語", meaning: "結局〜だと分かった", sentenceNumber: 4 },
      { word: "rehearsed", phonetic: "/rɪˈhɜːrst/", pos: "動詞", meaning: "（前もって）練習した、頭の中で繰り返した", sentenceNumber: 5 },
      { word: "out loud", pos: "熟語", meaning: "声に出して", sentenceNumber: 5 },
      { word: "moved on", pos: "熟語", meaning: "次へ進んだ", sentenceNumber: 6 },
      { word: "suspect", phonetic: "/səˈspekt/", pos: "動詞", meaning: "〜ではないかと思う", sentenceNumber: 7 },
      { word: "accuracy", phonetic: "/ˈækjərəsi/", pos: "名詞", meaning: "正確さ", sentenceNumber: 7 },
      { word: "spilled", phonetic: "/spɪld/", pos: "動詞", meaning: "こぼした", sentenceNumber: 8 },
      { word: "immediately", phonetic: "/ɪˈmiːdiətli/", pos: "副詞", meaning: "すぐに、即座に", sentenceNumber: 11 },
    ],
  },
  {
    id: "sample_rocky_start",
    title: "A Rocky Start, A Steady Landing",
    titleJa: "出だしはつまずき、着地は静かに",
    summary:
      "納期が遅れかけたプロジェクトを、報告の仕方を変えることで立て直したチームの話。会議・メール・進捗報告など、TOEIC で頻出のビジネス表現を含む。",
    level: "toeic",
    tags: ["ビジネス", "プロジェクト管理", "会議"],
    daysAgo: 16,
    paragraphs: [
      [
        [
          "The project was two weeks behind schedule before anyone said so out loud.",
          "誰かが口に出すより前に、そのプロジェクトは二週間遅れていた。",
        ],
        [
          "Each team reported that its own part was on track, which was technically true and completely useless.",
          "どのチームも自分の担当は予定どおりだと報告した。厳密には本当で、まったく役に立たない報告だった。",
        ],
        [
          "The delays were hiding in the gaps between the teams.",
          "遅れはチームとチームのすき間に隠れていたのだ。",
        ],
      ],
      [
        [
          "At the Monday meeting, the project manager changed one question.",
          "月曜の会議で、プロジェクトマネージャーは質問をひとつ変えた。",
        ],
        [
          "Instead of asking whether each team was on schedule, she asked what each team was waiting for.",
          "各チームが予定どおりかを聞く代わりに、各チームが何を待っているのかを聞いたのだ。",
        ],
        [
          "The room went quiet, and then three people answered at once.",
          "部屋は静まり返り、それから三人が同時に答えた。",
        ],
        [
          "Within twenty minutes, the team had found four dependencies that no one had recorded anywhere.",
          "二十分もしないうちに、どこにも記録されていなかった依存関係が四つ見つかった。",
        ],
      ],
      [
        [
          "They did not make up the two weeks, and the client was told so directly.",
          "二週間の遅れを取り戻すことはできなかったし、その旨は顧客にもはっきり伝えられた。",
        ],
        [
          "What they did was deliver the remaining work without a single further surprise.",
          "彼らがやったのは、残りの作業を、もう一度も不意打ちを出さずに仕上げることだった。",
        ],
        [
          "In the review, the client said the revised timeline had been easier to work with than the original one.",
          "振り返りの場で顧客は、修正後のスケジュールのほうが当初のものより扱いやすかったと述べた。",
        ],
        [
          "A schedule you can trust, it turns out, is worth more than a schedule you can brag about.",
          "信用できるスケジュールは、自慢できるスケジュールより価値がある。結局はそういうことだった。",
        ],
      ],
    ],
    parts: [
      { startSentence: 1, endSentence: 3, title: "誰も言わなかった遅れ", summary: "個別には順調、全体では遅延という状態。" },
      { startSentence: 4, endSentence: 7, title: "質問を変える", summary: "「予定どおりか」から「何を待っているか」へ。" },
      { startSentence: 8, endSentence: 11, title: "取り戻せなかった二週間", summary: "遅れは残したまま、信頼できる進行に切り替える。" },
    ],
    vocab: [
      { word: "behind schedule", pos: "熟語", meaning: "予定より遅れて", sentenceNumber: 1 },
      { word: "on track", pos: "熟語", meaning: "順調に進んで", sentenceNumber: 2 },
      { word: "technically", phonetic: "/ˈteknɪkli/", pos: "副詞", meaning: "厳密にいえば（形式的にはそのとおりだが、の含み）", sentenceNumber: 2 },
      { word: "delays", phonetic: "/dɪˈleɪz/", pos: "名詞", meaning: "遅れ", sentenceNumber: 3 },
      { word: "dependencies", phonetic: "/dɪˈpendənsiz/", pos: "名詞", meaning: "（他の作業への）依存関係", sentenceNumber: 7 },
      { word: "make up", pos: "熟語", meaning: "（遅れなどを）取り戻す", sentenceNumber: 8 },
      { word: "deliver", phonetic: "/dɪˈlɪvər/", pos: "動詞", meaning: "（成果物を）出す、納める", sentenceNumber: 9 },
      { word: "revised", phonetic: "/rɪˈvaɪzd/", pos: "形容詞", meaning: "修正された", sentenceNumber: 10 },
      { word: "timeline", phonetic: "/ˈtaɪmlaɪn/", pos: "名詞", meaning: "日程、スケジュール", sentenceNumber: 10 },
      { word: "brag about", pos: "熟語", meaning: "〜を自慢する", sentenceNumber: 11 },
    ],
  },
  {
    id: "sample_sugar_pill",
    title: "The Sugar Pill",
    titleJa: "砂糖の錠剤",
    summary:
      "プラセボ効果をめぐる研究の入門。実験デザイン、対照群、期待という変数を扱う説明文で、TOEFL のリーディングに近い密度と抽象度。",
    level: "toefl",
    tags: ["科学", "医学", "研究手法"],
    daysAgo: 25,
    paragraphs: [
      [
        [
          "In a clinical trial, some participants receive the drug being tested and others receive a pill with no active ingredient at all.",
          "臨床試験では、一部の参加者は試験対象の薬を、それ以外の参加者は有効成分をいっさい含まない錠剤を受け取る。",
        ],
        [
          "The second group exists so that researchers can separate the effect of the drug from the effect of being treated.",
          "後者の群が置かれるのは、薬そのものの効果と、治療を受けているという事実の効果とを、研究者が切り分けられるようにするためだ。",
        ],
        [
          "What complicates the picture is that the inactive pill frequently works.",
          "話をややこしくしているのは、その不活性な錠剤がしばしば効いてしまうという点である。",
        ],
      ],
      [
        [
          "Patients given a placebo have reported reduced pain, improved sleep, and steadier moods.",
          "プラセボを与えられた患者が、痛みの軽減、睡眠の改善、気分の安定を報告してきた。",
        ],
        [
          "These reports are not simply imagined, since measurable changes in brain activity accompany them.",
          "こうした報告は単なる思い込みではない。脳活動の測定可能な変化が伴っているからだ。",
        ],
        [
          "Expectation, it appears, is itself a biological event.",
          "期待というものは、それ自体が生物学的な出来事であるらしい。",
        ],
        [
          "The size of the effect depends on factors that have nothing to do with chemistry, such as the color of the pill and the confidence of the doctor who hands it over.",
          "その効果の大きさは、化学とは何の関係もない要因に左右される。錠剤の色や、それを手渡す医師の自信の度合いといったものに。",
        ],
      ],
      [
        [
          "This poses a practical problem for anyone designing a study.",
          "このことは、研究を設計する者にとって現実的な問題を突きつける。",
        ],
        [
          "If both groups improve, the drug must outperform the placebo by a margin large enough to rule out chance.",
          "両方の群が改善した場合、その薬は偶然では説明できないだけの差をつけてプラセボを上回らなければならない。",
        ],
        [
          "For this reason, neither the patients nor the researchers are told who received which pill until the trial has ended.",
          "そのため、試験が終わるまで、どちらの錠剤を誰が受け取ったのかは患者にも研究者にも知らされない。",
        ],
        [
          "The design is not a formality; it is the only way to keep expectation from quietly answering the question for us.",
          "この設計は形式ではない。期待が私たちに代わって静かに答えを出してしまうのを防ぐ、唯一の方法なのだ。",
        ],
      ],
    ],
    parts: [
      { startSentence: 1, endSentence: 3, title: "対照群という仕組み", summary: "薬の効果と「治療を受けている」効果を分けるための設計。" },
      { startSentence: 4, endSentence: 7, title: "期待という変数", summary: "プラセボが実際に効く、その測定可能な裏づけ。" },
      { startSentence: 8, endSentence: 11, title: "二重盲検が要る理由", summary: "期待が結論を先取りしないようにするための手続き。" },
    ],
    vocab: [
      { word: "clinical trial", pos: "名詞", meaning: "臨床試験", sentenceNumber: 1 },
      { word: "active ingredient", pos: "名詞", meaning: "有効成分", sentenceNumber: 1 },
      { word: "separate A from B", pos: "熟語", meaning: "A を B から切り分ける", sentenceNumber: 2 },
      { word: "complicates", phonetic: "/ˈkɑːmplɪkeɪts/", pos: "動詞", meaning: "複雑にする", sentenceNumber: 3 },
      { word: "placebo", phonetic: "/pləˈsiːboʊ/", pos: "名詞", meaning: "プラセボ、偽薬", sentenceNumber: 4 },
      { word: "measurable", phonetic: "/ˈmeʒərəbl/", pos: "形容詞", meaning: "測定できる", sentenceNumber: 5 },
      { word: "accompany", phonetic: "/əˈkʌmpəni/", pos: "動詞", meaning: "〜に伴う", sentenceNumber: 5 },
      { word: "expectation", phonetic: "/ˌekspekˈteɪʃn/", pos: "名詞", meaning: "期待、予期", sentenceNumber: 6 },
      { word: "have nothing to do with", pos: "熟語", meaning: "〜とは何の関係もない", sentenceNumber: 7 },
      { word: "poses a problem", pos: "熟語", meaning: "問題を提起する、問題となる", sentenceNumber: 8 },
      { word: "outperform", phonetic: "/ˌaʊtpərˈfɔːrm/", pos: "動詞", meaning: "〜を上回る成績を示す", sentenceNumber: 9 },
      { word: "rule out", pos: "熟語", meaning: "〜を除外する、〜の可能性を排除する", sentenceNumber: 9 },
      { word: "formality", phonetic: "/fɔːrˈmæləti/", pos: "名詞", meaning: "形式上の手続き、形だけのもの", sentenceNumber: 11 },
    ],
  },
];

const DAY = 24 * 60 * 60 * 1000;

function toMaterial(src: SampleSource): Material {
  const pairs = src.paragraphs.flat();
  const text = src.paragraphs
    .map((paragraph) => paragraph.map(([en]) => en).join(" "))
    .join("\n\n");

  const translations = new Map<number, string>();
  pairs.forEach(([, ja], i) => translations.set(i + 1, ja));

  const material = buildMaterial({
    id: src.id,
    text,
    source: "sample",
    title: src.title,
    titleJa: src.titleJa,
    summary: src.summary,
    level: src.level,
    tags: src.tags,
    translations,
    parts: src.parts,
    vocab: src.vocab,
    aiGenerated: true,
    // 本棚で新しい順に並んだときサンプルが上に来すぎないよう、過去の日付にする
    createdAt: Date.now() - src.daysAgo * DAY,
  });

  // 文分割の結果と手書きの対訳がずれていたら、訳を落として気づけるようにする
  if (material.sentences.length !== pairs.length) {
    console.warn(
      `[scriptflow] サンプル「${src.title}」の文数が対訳とずれています ` +
        `(${material.sentences.length} vs ${pairs.length})`,
    );
  }
  return material;
}

let memo: Material[] | null = null;

/** 本棚の初期状態に入れるサンプル教材。 */
export function sampleMaterials(): Material[] {
  if (!memo) memo = SOURCES.map(toMaterial);
  return memo;
}

export const SAMPLE_IDS = new Set(SOURCES.map((s) => s.id));

# -*- coding: utf-8 -*-
"""英文法総復習プリントの問題データ。

各単元は次の構成:
  points : [見出し語, 解説] の並び（要点まとめ）
  mcq    : 4択問題  (設問 / 選択肢4つ / 正解index / 解説)
  form   : 語形変化問題 (設問 / 解答 / 解説)
  trans  : 和文英訳   (日本語 / 解答例 / 解説)

設問番号は各単元内で通し番号（4択=1-5, 語形変化=6-8, 英訳=9-10）。
"""

TITLE = "英文法 総復習プリント"
SUBTITLE = "高校英文法 10単元 / 全100問"

UNITS = [
    # ------------------------------------------------------------------ 1
    dict(
        title="時制 ― 現在・過去・未来と進行形",
        points=[
            ["現在形", "現在の習慣、不変の真理、時刻表などの確定した予定を表す。"
                       "  The train leaves at seven."],
            ["過去形", "過去の一時点の動作・状態。yesterday, ago, last 〜 など"
                       "過去を示す語句と共に使う。"],
            ["未来表現", "will＝その場で決めた意志・単純な未来。be going to＝"
                         "前から決めていた予定、現在の兆候からの予測。"],
            ["進行形", "一時的に進行中の動作。know, belong, resemble, "
                       "contain などの状態動詞は原則進行形にしない。"],
            ["時・条件の副詞節", "when, if, before, until などの副詞節の中では、"
                                 "未来のことでも現在形で表す。"],
        ],
        mcq=[
            ("Water (        ) at 100 degrees Celsius.",
             ["boil", "boils", "is boiling", "boiled"], 1,
             "不変の真理は現在形。主語が三人称単数なので boils。"),
            ("I (        ) my homework when the phone rang.",
             ["do", "did", "was doing", "have done"], 2,
             "過去の一時点で進行中だった動作 → 過去進行形。"),
            ("If it (        ) tomorrow, we will cancel the picnic.",
             ["will rain", "rains", "rained", "is raining"], 1,
             "条件を表す副詞節の中では未来のことも現在形で表す。"),
            ("Look at those dark clouds! It (        ) rain soon.",
             ["will", "is going to", "shall", "would"], 1,
             "目の前の兆候からの予測は be going to。"),
            ("He (        ) to the tennis club now.",
             ["is belonging", "belongs", "belong", "is belong"], 1,
             "belong は状態動詞なので進行形にしない。"),
        ],
        form=[
            ("The train ( leave ) at 6:30 tomorrow morning.", "leaves",
             "時刻表どおりの確定した予定は現在形。"),
            ("I ( watch ) TV at nine last night.", "was watching",
             "過去の一時点で進行中 → 過去進行形。"),
            ("Please wait here until she ( come ) back.", "comes",
             "時を表す副詞節なので現在形。"),
        ],
        trans=[
            ("彼が到着したとき、私たちは夕食を食べているところだった。",
             "We were having dinner when he arrived.",
             "背景となる動作が過去進行形、割り込む動作が過去形。"),
            ("明日晴れたら、私は公園に行くつもりです。",
             "If it is sunny tomorrow, I will go to the park.",
             "if 節は現在形、主節は will。"),
        ],
    ),
    # ------------------------------------------------------------------ 2
    dict(
        title="完了形 ― 現在完了・過去完了・未来完了",
        points=[
            ["現在完了", "have[has] + 過去分詞。完了・結果／経験／継続の3用法。"
                         "過去の一時点を示す語（yesterday, 〜 ago）とは併用しない。"],
            ["継続", "for（期間）／since（起点）。動作動詞の継続は現在完了進行形"
                     "have been doing を使う。"],
            ["経験", "have been to 〜（〜へ行ったことがある）と "
                     "have gone to 〜（行ってしまって今ここにいない）を区別する。"],
            ["過去完了", "had + 過去分詞。過去のある時点までの完了・経験・継続、"
                         "およびそれより前の出来事（大過去）。"],
            ["未来完了", "will have + 過去分詞。未来のある時点までの完了・経験・継続。"],
        ],
        mcq=[
            ("I (        ) in this town since 2010.",
             ["live", "lived", "have lived", "had lived"], 2,
             "since 〜 は現在完了の継続用法の目印。"),
            ("She (        ) to Kyoto three times.",
             ["has been", "has gone", "went", "has been going"], 0,
             "「行ったことがある」という経験は have been to。"),
            ("When I got to the station, the train (        ) already left.",
             ["has", "had", "have", "was"], 1,
             "過去の一時点より前に起きたこと → 過去完了。"),
            ("I (        ) my homework yet.",
             ["don't finish", "haven't finished", "hadn't finished",
              "didn't finish"], 1,
             "yet（まだ）は現在完了の完了用法と共に使う。"),
            ("By next March, I (        ) English for six years.",
             ["will study", "have studied", "will have studied",
              "had studied"], 2,
             "by next March という未来の時点までの継続 → 未来完了。"),
        ],
        form=[
            ("How long ( you / know ) each other?", "have you known",
             "know は状態動詞なので現在完了で継続を表す。"),
            ("It ( rain ) for three days, and it is still raining.",
             "has been raining",
             "動作の継続で今も続いている → 現在完了進行形。"),
            ("I realized that I ( meet ) her before.", "had met",
             "realized より前の経験なので過去完了。"),
        ],
        trans=[
            ("私は一度もその映画を見たことがない。",
             "I have never seen the movie.",
             "経験の否定は have never + 過去分詞。"),
            ("彼女は3年間ずっとピアノを習っている。",
             "She has been learning the piano for three years.",
             "動作の継続 → 現在完了進行形。has learned でも可。"),
        ],
    ),
    # ------------------------------------------------------------------ 3
    dict(
        title="助動詞",
        points=[
            ["義務・不必要", "must / have to（〜しなければならない）。"
                             "must not＝禁止、don't have to＝不要。意味が全く違う。"],
            ["推量", "must be（〜に違いない）＞ may[might] be（かもしれない）"
                     "＞ cannot be（〜のはずがない）。"],
            ["助動詞＋have＋過去分詞", "must have done（〜したに違いない）／"
                                      "cannot have done（したはずがない）／"
                                      "should have done（すべきだったのに）／"
                                      "may have done（したかもしれない）。"],
            ["過去の習慣", "used to do（以前は〜した／かつては〜だった：状態にも使える）／"
                           "would (often) do（よく〜したものだ：動作のみ）。"],
            ["その他", "had better do（〜したほうがよい）、would like to do、"
                       "may well do（〜するのももっともだ）。"],
        ],
        mcq=[
            ("You (        ) be tired after such a long trip.",
             ["must", "can", "should", "ought"], 0,
             "強い推量「〜に違いない」は must。"),
            ("It's a holiday tomorrow, so you (        ) get up early.",
             ["must not", "don't have to", "can't", "may not"], 1,
             "「〜する必要がない」は don't have to。must not は禁止。"),
            ("He (        ) the news, or he would have told me.",
             ["must have heard", "can't have heard", "should have heard",
              "may have heard"], 1,
             "「聞いたはずがない」＝ cannot have + 過去分詞。"),
            ("You (        ) told her the truth. She was very upset.",
             ["should have", "shouldn't have", "must have", "need have"], 1,
             "「〜すべきではなかったのに」＝ should not have + 過去分詞。"),
            ("There (        ) a temple here, but it was burned down.",
             ["used to be", "was used to be", "would be", "is used to be"], 0,
             "過去の状態は used to。would は過去の状態には使えない。"),
        ],
        form=[
            ("彼は昨日そこにいたはずがない。  He (        ) there yesterday.",
             "cannot [can't] have been",
             "過去のことへの強い否定推量。"),
            ("もっと注意すべきだったのに。  I (        ) more careful.",
             "should have been",
             "実際にはしなかった過去への後悔。"),
            ("彼女は鍵をなくしたのかもしれない。  She (        ) her key.",
             "may [might] have lost",
             "過去のことへの推量。"),
        ],
        trans=[
            ("あなたはここで待つ必要はありません。",
             "You don't have to wait here.",
             "need not wait も可。must not は「待ってはいけない」で誤り。"),
            ("彼は忙しかったに違いない。",
             "He must have been busy.",
             "過去のことへの確信は must have + 過去分詞。"),
        ],
    ),
    # ------------------------------------------------------------------ 4
    dict(
        title="受動態",
        points=[
            ["基本形", "be動詞 + 過去分詞 (+ by 〜)。行為者が不明・重要でないときは "
                       "by 〜 を省く。"],
            ["時制との組み合わせ", "is done／was done／will be done／"
                                   "is being done（進行）／has been done（完了）。"],
            ["助動詞と共に", "can[must, should] be done の形。"],
            ["群動詞の受動態", "laugh at → be laughed at、take care of → "
                               "be taken care of のように前置詞・副詞を残す。"],
            ["by 以外の前置詞", "be interested in／be surprised at／"
                                "be covered with／be known to／be satisfied with／"
                                "be filled with。"],
        ],
        mcq=[
            ("This temple (        ) about 300 years ago.",
             ["built", "was built", "has built", "is building"], 1,
             "寺は「建てられた」側。過去の受動態。"),
            ("The road (        ) now.",
             ["is repairing", "repairs", "is being repaired",
              "has repaired"], 2,
             "「今〜されている最中」は進行形の受動態 be being done。"),
            ("I was surprised (        ) the news.",
             ["with", "at", "of", "for"], 1,
             "be surprised at 〜（〜に驚く）。"),
            ("The mountain is covered (        ) snow.",
             ["by", "in", "with", "of"], 2,
             "be covered with 〜（〜で覆われている）。"),
            ("He was laughed (        ) by everyone.",
             ["at", "to", "for", "with"], 0,
             "群動詞 laugh at は at を残したまま受動態にする。"),
        ],
        form=[
            ("They speak English in Australia.  →  English (        ) in Australia.",
             "is spoken",
             "一般の人を表す they が主語のときは by them を省く。"),
            ("Someone has stolen my bike.  →  My bike (        ).",
             "has been stolen",
             "現在完了の受動態は have been + 過去分詞。"),
            ("We must finish the work by Friday.  →  The work (        ) by Friday.",
             "must be finished",
             "助動詞 + be + 過去分詞。"),
        ],
        trans=[
            ("この本は多くの若者に読まれている。",
             "This book is read by many young people.",
             "read の過去分詞は read（発音は /red/）。"),
            ("彼女の名前はみんなに知られている。",
             "Her name is known to everyone.",
             "be known to 〜（〜に知られている）。by は使わない。"),
        ],
    ),
    # ------------------------------------------------------------------ 5
    dict(
        title="不定詞",
        points=[
            ["3つの用法", "名詞的（〜すること）／形容詞的（〜するための・〜すべき）／"
                          "副詞的（目的・原因・結果・判断の根拠）。"],
            ["It ... to do", "It is 形容詞 for 人 to do が基本。kind, foolish, "
                             "careless など人の性質を表す語のときは of 人 を使う。"],
            ["疑問詞 + to do", "what to do／how to use／where to go などが"
                               "名詞のかたまりとして働く。"],
            ["程度の表現", "too ... to do（〜すぎて…できない）／"
                           "... enough to do（〜するのに十分…）。"],
            ["原形不定詞", "make／let／have + O + 原形、"
                           "see／hear／feel + O + 原形（知覚動詞）。"],
            ["完了不定詞", "to have + 過去分詞。述語動詞より前の時を表す。"
                           "He seems to have been ill."],
        ],
        mcq=[
            ("It is kind (        ) you to help me.",
             ["for", "of", "to", "with"], 1,
             "kind は人の性質を表す形容詞なので of を使う。"),
            ("He was (        ) tired to walk any further.",
             ["so", "very", "too", "enough"], 2,
             "too 〜 to do（〜すぎて…できない）。"),
            ("My mother made me (        ) the dishes.",
             ["wash", "to wash", "washing", "washed"], 0,
             "使役動詞 make は原形不定詞をとる。"),
            ("I don't know what (        ) next.",
             ["do", "to do", "doing", "done"], 1,
             "疑問詞 + to do が know の目的語になる。"),
            ("She seems (        ) sick yesterday.",
             ["to be", "to have been", "being", "to being"], 1,
             "seems（現在）より前のことなので完了不定詞。"),
        ],
        form=[
            ("He is rich enough ( buy ) the car.", "to buy",
             "形容詞 + enough to do の語順に注意。"),
            ("I heard someone ( call ) my name.", "call [calling]",
             "知覚動詞 + O + 原形（動作全体）／現在分詞（進行中）。"),
            ("It is difficult for me ( solve ) this problem.", "to solve",
             "It is ... for 人 to do の形式主語構文。"),
        ],
        trans=[
            ("彼は疲れすぎて歩けなかった。",
             "He was too tired to walk.",
             "so tired that he could not walk と書き換えられる。"),
            ("私に何をすべきか教えてください。",
             "Please tell me what to do.",
             "what I should do とも言える。"),
        ],
    ),
    # ------------------------------------------------------------------ 6
    dict(
        title="動名詞",
        points=[
            ["動名詞のみを目的語にとる動詞", "enjoy, finish, mind, avoid, give up, "
                                             "put off, escape, practice, admit, "
                                             "consider, stop（やめる）。"],
            ["不定詞のみを目的語にとる動詞", "hope, wish, want, decide, promise, "
                                             "expect, refuse, manage, offer, agree。"],
            ["意味が変わる動詞", "remember[forget] to do（これからのこと）／"
                                 "doing（過去のこと）。try to do（努力する）／"
                                 "doing（試しにやってみる）。"],
            ["stop の区別", "stop to do は「〜するために立ち止まる」（不定詞は目的）、"
                            "stop doing は「〜するのをやめる」。"],
            ["慣用表現", "be used to doing（慣れている）／look forward to doing／"
                         "It is no use doing／feel like doing／cannot help doing／"
                         "on doing（〜するとすぐ）／be worth doing。"],
        ],
        mcq=[
            ("I enjoy (        ) music before going to bed.",
             ["listen", "to listen", "listening to", "listened"], 2,
             "enjoy は動名詞のみ。listen は自動詞なので to が必要。"),
            ("I'm looking forward to (        ) you again.",
             ["see", "seeing", "seen", "have seen"], 1,
             "この to は前置詞なので動名詞が続く。"),
            ("Remember (        ) the door when you leave.",
             ["lock", "locking", "to lock", "locked"], 2,
             "これからすることを忘れずに → remember to do。"),
            ("It is no use (        ) over spilt milk.",
             ["cry", "to cry", "crying", "cried"], 2,
             "It is no use doing（〜しても無駄だ）。"),
            ("She is used to (        ) alone.",
             ["live", "living", "lived", "be living"], 1,
             "be used to doing（〜に慣れている）。used to do と混同しない。"),
        ],
        form=[
            ("Would you mind ( open ) the window?", "opening",
             "mind は動名詞のみを目的語にとる。"),
            ("He decided ( study ) abroad.", "to study",
             "decide は不定詞のみ。"),
            ("I'll never forget ( visit ) Paris last summer.", "visiting",
             "過去にしたことを忘れない → forget doing。"),
        ],
        trans=[
            ("この本は読む価値がある。",
             "This book is worth reading.",
             "be worth doing。目的語 it は付けない。"),
            ("私は宿題をするのを先延ばしにした。",
             "I put off doing my homework.",
             "put off は動名詞をとる。postpone doing も可。"),
        ],
    ),
    # ------------------------------------------------------------------ 7
    dict(
        title="分詞・分詞構文",
        points=[
            ["名詞を修飾", "現在分詞＝「〜している」、過去分詞＝「〜される・された」。"
                           "1語なら名詞の前、句なら名詞の後ろに置く。"],
            ["SVOC", "keep／leave／find + O + 分詞、"
                     "see／hear + O + 分詞（進行中の動作）。"],
            ["have[get] + O + 過去分詞", "「〜してもらう」（使役）と"
                                         "「〜される」（被害）の両方を表す。"],
            ["分詞構文", "接続詞＋S＋V を分詞で書き換える。主節と主語が同じことが原則。"
                         "時・理由・条件・付帯状況を表す。"],
            ["分詞構文の応用", "否定は Not doing。主節より前のことは Having done。"
                               "受動は (Being) done。"],
            ["with + O + 分詞", "付帯状況「〜しながら／〜した状態で」。"
                                "with her eyes closed。"],
        ],
        mcq=[
            ("Look at the (        ) baby.",
             ["sleep", "sleeping", "slept", "to sleep"], 1,
             "「眠っている赤ちゃん」＝現在分詞1語で前から修飾。"),
            ("I had my hair (        ) yesterday.",
             ["cut", "cutting", "to cut", "cuts"], 0,
             "have + O + 過去分詞（〜してもらう）。cut の過去分詞は cut。"),
            ("(        ) from the plane, the islands looked beautiful.",
             ["Seeing", "Seen", "To see", "See"], 1,
             "島は「見られる」側なので過去分詞。"),
            ("(        ) what to say, he kept silent.",
             ["Not knowing", "Knowing not", "Not known", "Don't know"], 0,
             "分詞構文の否定は Not を分詞の前に置く。"),
            ("She sat there with her eyes (        ).",
             ["close", "closing", "closed", "to close"], 2,
             "目は「閉じられる」側 → with + O + 過去分詞。"),
        ],
        form=[
            ("The language ( speak ) in that country is French.", "spoken",
             "「話されている言語」なので過去分詞が後ろから修飾。"),
            ("( Live ) in the countryside, I don't need a car.", "Living",
             "理由を表す分詞構文。"),
            ("( Finish ) my homework, I went out.", "Having finished",
             "主節より前に終わった動作なので完了形の分詞構文。"),
        ],
        trans=[
            ("彼は音楽を聴きながら勉強していた。",
             "He was studying, listening to music.",
             "付帯状況の分詞構文。while listening to music も可。"),
            ("私はその窓が壊されているのを見つけた。",
             "I found the window broken.",
             "find + O + 過去分詞。"),
        ],
    ),
    # ------------------------------------------------------------------ 8
    dict(
        title="関係詞",
        points=[
            ["関係代名詞", "人：who／whose／whom(who)、物：which／whose(of which)／"
                           "which。that は人・物どちらにも使える。"],
            ["目的格の省略", "目的格の関係代名詞は省略できる。"
                             "the book (which) I bought"],
            ["前置詞 + 関係代名詞", "the pen with which I write。"
                                    "この形では that は使えず、who も whom になる。"],
            ["関係副詞", "when（時）／where（場所）／why（理由）／how（方法）。"
                         "the way how とは言わず、the way か how の一方だけ使う。"],
            ["what", "先行詞を含み「〜すること・もの」。= the thing(s) which。"],
            ["非制限用法", "コンマ + 関係詞。補足説明を加える。that は使えない。"],
            ["複合関係詞", "whoever（〜する人は誰でも）、whatever、whenever、"
                           "however + 形容詞・副詞。"],
        ],
        mcq=[
            ("This is the book (        ) I bought yesterday.",
             ["who", "whose", "which", "what"], 2,
             "先行詞が物で目的格なので which（that も可・省略も可）。"),
            ("I know a girl (        ) father is a doctor.",
             ["who", "whose", "which", "whom"], 1,
             "「その少女の父」なので所有格 whose。"),
            ("This is the house (        ) I was born.",
             ["which", "that", "where", "what"], 2,
             "後ろが完全な文なので関係副詞 where（= in which）。"),
            ("(        ) he said at the meeting was not true.",
             ["That", "What", "Which", "Who"], 1,
             "先行詞がなく「彼が言ったこと」なので what。"),
            ("He has two sons, (        ) live in Tokyo.",
             ["who", "that", "which", "whom"], 0,
             "非制限用法では that は使えない。先行詞は人で主格。"),
        ],
        form=[
            ("Tell me the reason (        ) you were late.", "why",
             "理由を表す関係副詞（= for which）。"),
            ("This is the pen (        ) I write letters.", "with which",
             "write with a pen の with が前に出た形。"),
            ("(        ) wants to come is welcome.", "Whoever",
             "「来たい人は誰でも」＝ Anyone who。"),
        ],
        trans=[
            ("私が昨日会った男性は先生です。",
             "The man (whom) I met yesterday is a teacher.",
             "目的格なので whom / who / that は省略できる。"),
            ("これが私が探していたものです。",
             "This is what I was looking for.",
             "先行詞を含む what を使う。"),
        ],
    ),
    # ------------------------------------------------------------------ 9
    dict(
        title="仮定法",
        points=[
            ["仮定法過去", "現在の事実に反する仮定。If + S + 過去形, S + would"
                           "[could / might] + 原形。be動詞は主語に関係なく were。"],
            ["仮定法過去完了", "過去の事実に反する仮定。If + S + had + 過去分詞, "
                               "S + would have + 過去分詞。"],
            ["混合型", "If + S + had + 過去分詞, S + would + 原形（現在の結果）。"],
            ["I wish / as if", "I wish + 仮定法（〜ならいいのに）、"
                               "as if + 仮定法（まるで〜であるかのように）。"],
            ["if の省略と倒置", "Were I you, ... ／ Had I known, ... のように"
                                 "if を省いて倒置にできる。"],
            ["if に代わる表現", "without 〜／but for 〜（〜がなければ）＝"
                                "if it were not for 〜／if it had not been for 〜。"],
            ["It is time + 仮定法過去", "It's time you went to bed."],
        ],
        mcq=[
            ("If I (        ) a bird, I could fly to you.",
             ["am", "were", "have been", "will be"], 1,
             "現在の事実に反する仮定 → 仮定法過去。be動詞は were。"),
            ("If he had studied harder, he (        ) the exam.",
             ["passes", "would pass", "would have passed", "had passed"], 2,
             "過去の事実に反する仮定 → 主節は would have + 過去分詞。"),
            ("I wish I (        ) how to swim.",
             ["know", "knew", "have known", "will know"], 1,
             "現在の願望なので I wish + 過去形。"),
            ("He talks as if he (        ) everything.",
             ["knows", "knew", "has known", "know"], 1,
             "実際は知らないので as if + 仮定法過去。"),
            ("(        ) your help, I couldn't have finished it.",
             ["Without", "With", "Unless", "If"], 0,
             "「あなたの助けがなかったら」＝ Without（= But for）。"),
        ],
        form=[
            ("If I ( have ) more time, I would travel around the world.",
             "had",
             "仮定法過去。現在の事実に反する。"),
            ("( Be ) I you, I would accept the offer.", "Were",
             "If I were you の if を省いた倒置形。"),
            ("It's time you ( go ) to bed.", "went",
             "It is time + S + 過去形（もう〜してよいころだ）。"),
        ],
        trans=[
            ("もっとお金があればなあ。",
             "I wish I had more money.",
             "現在の事実に反する願望。"),
            ("もし彼が早く出発していたら、電車に間に合っただろうに。",
             "If he had left earlier, he would have caught the train.",
             "過去の事実に反する仮定。"),
        ],
    ),
    # ----------------------------------------------------------------- 10
    dict(
        title="比較",
        points=[
            ["原級", "as + 原級 + as 〜。否定は not as[so] 〜 as。"
                     "倍数は twice[three times] as 〜 as。"],
            ["比較級", "-er / more 〜 + than。強調は much, far, even, still を使い、"
                       "very は使えない。"],
            ["最上級", "the + -est / most。範囲は of + 複数名詞、"
                       "in + 場所・集団。"],
            ["比較級で最上級の意味", "No (other) 〜 is 比較級 than A ／"
                                     "A is 比較級 than any other + 単数名詞。"],
            ["the 比較級, the 比較級", "「〜すればするほど…」"
                                       "The more you practice, the better you get."],
            ["慣用表現", "as 〜 as possible（= as 〜 as one can）／"
                         "know better than to do／much less。"],
        ],
        mcq=[
            ("This book is (        ) interesting than that one.",
             ["very", "much", "more", "most"], 2,
             "interesting は more をつけて比較級を作る。"),
            ("He is (        ) taller than his brother.",
             ["very", "much", "more", "too"], 1,
             "比較級の強調に very は使えない。much / far を使う。"),
            ("Mt. Fuji is the highest mountain (        ) Japan.",
             ["of", "in", "at", "on"], 1,
             "場所の範囲を示すときは in。"),
            ("No other student in my class is (        ) than Ken.",
             ["tall", "taller", "tallest", "as tall"], 1,
             "No other 〜 + 比較級 + than で最上級の意味。"),
            ("The (        ) you practice, the better you will become.",
             ["much", "many", "more", "most"], 2,
             "The + 比較級, the + 比較級 の構文。"),
        ],
        form=[
            ("She can run as ( fast ) as her brother.", "fast",
             "as 〜 as の間は原級のまま。"),
            ("This is the ( good ) movie I have ever seen.", "best",
             "good の最上級は best。経験を表す現在完了と共に使う。"),
            ("Tokyo is bigger than ( any / other / city ) in Japan.",
             "any other city",
             "than any other + 単数名詞。"),
        ],
        trans=[
            ("彼女はできるだけ早く走った。",
             "She ran as fast as she could.",
             "as fast as possible も可。時制の一致で could。"),
            ("東京の人口はロンドンの人口より多い。",
             "The population of Tokyo is larger than that of London.",
             "人口の多い・少ないは large / small。比較対象を that で受ける。"),
        ],
    ),
]

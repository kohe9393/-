#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""特選プリント・ジェネレータ

「夏 特選1講」と同じ体裁（英文1文ごとに下線罫＋広い行間、その下に和訳）の
A4プリントを、JSON の原稿から組版して HTML で出力する。
出力した HTML をブラウザで開き、Ctrl/Cmd+P → PDF に保存 → 印刷する。

    # 1) 英文べた打ちテキストから JSON の雛形を作る（文分割まで自動）
    python3 tokusen.py init lessons/eigo-T-02.txt -o lessons/eigo-T-02.json

    # 2) JSON の "ja" に和訳を書き入れる

    # 3) 組版する
    python3 tokusen.py build lessons/eigo-T-02.json -o build/eigo-T-02.html
    python3 tokusen.py build lessons/eigo-T-02.json --variant blank   # 和訳を空欄にした演習用
"""

import argparse
import html
import json
import os
import re
import sys

# ---------------------------------------------------------------- 文分割

# 文末のピリオドと紛らわしい略語（この後ろでは切らない）
ABBREV = {
    "Mr", "Mrs", "Ms", "Dr", "Prof", "St", "Jr", "Sr", "vs", "etc", "e.g", "i.e",
    "BC", "AD", "No", "Fig", "Vol", "Ch", "p", "pp", "cf",
}

_SENT_BOUNDARY = re.compile(
    r'(?:(?<=[.!?])|(?<=[.!?][)"’”]))\s+(?=[({“"‘’A-Z0-9])'
)


def split_sentences(text):
    """英文パラグラフを文に分ける。略語・数字の直後では切らない。"""
    text = " ".join(text.split())
    if not text:
        return []
    out, start = [], 0
    for m in _SENT_BOUNDARY.finditer(text):
        head = text[start:m.start()]
        last = re.split(r"[\s(]", head.rstrip(".!?\"')”’"))[-1]
        if last.rstrip(".") in ABBREV:          # "in 47 BC Julius..." で切らない
            continue
        if re.fullmatch(r"[A-Z]", last.rstrip(".")):   # イニシャル "J. Caesar"
            continue
        out.append(head.strip())
        start = m.end()
    tail = text[start:].strip()
    if tail:
        out.append(tail)
    return out


def split_paragraphs(text):
    """空行、または行頭の全角/半角インデントを段落境界とみなす。"""
    blocks = re.split(r"\n\s*\n", text.strip())
    return [b for b in (" ".join(x.split()) for x in blocks) if b]


# ---------------------------------------------------------------- 雛形生成

def cmd_init(args):
    raw = open(args.source, encoding="utf-8").read()
    paragraphs = []
    for i, para in enumerate(split_paragraphs(raw), 1):
        paragraphs.append({
            "n": i,
            "sentences": [{"en": s, "ja": ""} for s in split_sentences(para)],
        })
    doc = {
        "title": args.title or os.path.splitext(os.path.basename(args.source))[0],
        "lesson": args.lesson or "",
        "source": "",
        "notes": [],
        "paragraphs": paragraphs,
    }
    dest = args.out or os.path.splitext(args.source)[0] + ".json"
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n = sum(len(p["sentences"]) for p in paragraphs)
    print(f"{dest} を作成しました（{len(paragraphs)} パラグラフ / {n} 文）。")
    print('"ja" に和訳を書き入れてから build してください。')


# ---------------------------------------------------------------- 組版

CSS = r"""
@page { size: A4 portrait; margin: 14mm 13mm 12mm 13mm; }

:root {
  --en-size: 11.3pt;      /* 英文の級数 */
  --en-leading: 3.05;     /* 英文の行送り（この余白に S/V/O/C を書き込む） */
  --ja-size: 9.4pt;
  --gutter: 13mm;         /* 段落番号・文番号を置く左の柱 */
  --rule: #000;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: #f0efec;
  color: #000;
  font-family: "Century Schoolbook", "New Century Schoolbook", Century,
               "Times New Roman", "Nimbus Roman", serif;
}

.sheet {
  width: 210mm; min-height: 297mm;
  padding: 14mm 13mm 12mm 13mm;
  margin: 8mm auto; background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.25);
}

.title {
  margin: 0 0 9mm; text-align: center;
  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic",
               "YuGothic", Meiryo, "Noto Sans JP", sans-serif;
  font-weight: 800; font-size: 27pt; letter-spacing: .14em;
}
.lesson {
  font-family: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS Mincho",
               "Noto Serif JP", serif;
  font-size: 10.5pt; margin: 0 0 4mm 1mm;
}

/* ---- 1文＝1ブロック（英文＋和訳）。改ページで割らない ---- */
.s { display: flex; align-items: flex-start; break-inside: avoid; page-break-inside: avoid; }
.s + .s { margin-top: 2.4mm; }
.para + .para { margin-top: 3.4mm; }

.gut {
  flex: 0 0 var(--gutter); position: relative;
  font-size: 10.5pt; line-height: 1.25;
  padding-top: 1.0em;               /* 文番号を英文1行目の高さにそろえる */
}
.pbox {                             /* 段落番号は文番号の真上に置く */
  position: absolute; top: -.48em; left: 0;
  width: 5.2mm; height: 5.2mm; line-height: 5.0mm;
  border: 1.1px solid #000; text-align: center;
  font-family: "Hiragino Mincho ProN", "Yu Mincho", serif; font-size: 10pt;
}
.sno {
  display: block; margin-left: .8mm;
  font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
}
.body { flex: 1 1 auto; min-width: 0; }

/* ---- 英文：全行に下線罫を敷き、行間を大きく空ける ---- */
.en {
  margin: 0; text-align: justify; text-justify: inter-word;
  font-size: var(--en-size); line-height: var(--en-leading);
  letter-spacing: .012em; word-spacing: .04em;
  text-decoration: underline;
  text-decoration-thickness: from-font;
  text-decoration-skip-ink: none;      /* g,y の下でも罫を切らない */
  text-underline-offset: .30em;
  hyphens: none;
}
.en .mk {   /* 下線部番号 (1) (2) … */
  font-size: 7.5pt; vertical-align: -.32em; letter-spacing: 0;
  text-decoration: none; display: inline-block; margin-right: .1em;
}

/* ---- 和訳 ---- */
.ja {
  margin: .5em 0 0; text-indent: 1em;
  font-family: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "MS Mincho",
               "Noto Serif JP", serif;
  font-size: var(--ja-size); line-height: 2.05; text-align: justify;
}
.ja-blank {
  margin: .9em 0 .2em;
  border-bottom: .6px solid #888;
  height: 0;
}
.ja-blank + .ja-blank { margin-top: 1.9em; }

/* ---- 語注・出典 ---- */
.notes {
  margin-top: 7mm; padding-top: 2.5mm; border-top: .8px solid #000;
  font-family: "Hiragino Mincho ProN", "Yu Mincho", serif; font-size: 9pt; line-height: 1.9;
}
.notes b { font-family: inherit; font-weight: 600; }
.src { margin-top: 2mm; font-size: 8.6pt; }

.pageno { margin-top: 6mm; text-align: center; font-size: 9pt; }

@media print {
  body { background: #fff; }
  .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  .pageno { display: none; }
}
"""

MARK_RE = re.compile(r"\{\{(.*?)\}\}")


def typo(text):
    """直打ちの ' \" を活字の約物に直す（Victoria's → Victoria\u2019s）。"""
    text = re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z]|\b)", "\u2019", text)
    text = re.sub(r"'(?=[A-Za-z])", "\u2018", text).replace("'", "\u2019")
    text = re.sub(r'"(?=\S)', "\u201c", text).replace('"', "\u201d")
    return text


def render_en(text):
    """{{1}} を下線部番号 (1) に変換しつつエスケープする。"""
    text = typo(text)
    parts, pos = [], 0
    for m in MARK_RE.finditer(text):
        parts.append(html.escape(text[pos:m.start()]))
        parts.append('<span class="mk">(%s)</span>' % html.escape(m.group(1)))
        pos = m.end()
    parts.append(html.escape(text[pos:]))
    return "".join(parts)


def blank_lines(ja, per_line=44):
    """和訳空欄版で敷く罫線の本数（和訳が入っていればその長さから見積もる）。"""
    if not ja:
        return 2
    return max(2, -(-len(ja) // per_line))


def render(doc, variant="full", leading=None, en_size=None):
    o = []
    o.append('<div class="sheet">')
    o.append('<h1 class="title">%s</h1>' % html.escape(doc.get("title", "")))
    if doc.get("lesson"):
        o.append('<div class="lesson">%s</div>' % html.escape(doc["lesson"]))

    for p in doc.get("paragraphs", []):
        o.append('<div class="para">')
        for i, s in enumerate(p.get("sentences", []), 1):
            o.append('<div class="s">')
            o.append('<div class="gut">')
            if i == 1:
                o.append('<span class="pbox">%s</span>' % html.escape(str(p.get("n", ""))))
            o.append('<span class="sno">%d、</span>' % i)
            o.append("</div>")
            o.append('<div class="body">')
            o.append('<p class="en">%s</p>' % render_en(s.get("en", "")))
            ja = s.get("ja", "").strip()
            if variant == "blank":
                o.append('<div class="ja-blank"></div>' * blank_lines(ja))
            elif ja:
                o.append('<p class="ja">%s</p>' % html.escape(ja))
            o.append("</div></div>")
        o.append("</div>")

    notes = doc.get("notes") or []
    if notes or doc.get("source"):
        o.append('<div class="notes">')
        if notes:
            items = ["<b>%s</b>: %s" % (html.escape(n["word"]), html.escape(n["gloss"]))
                     for n in notes]
            o.append("（注）" + "　".join(items))
        if doc.get("source"):
            o.append('<div class="src">%s</div>' % html.escape(doc["source"]))
        o.append("</div>")

    o.append("</div>")

    tune = ""
    if leading or en_size:
        v = []
        if leading:
            v.append("--en-leading:%s" % leading)
        if en_size:
            v.append("--en-size:%s" % en_size)
        tune = "\n<style>:root{%s}</style>" % ";".join(v)

    title = html.escape(doc.get("title", "print"))
    return (
        "<!doctype html>\n<html lang=\"ja\"><head><meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        f"<title>{title}</title>\n<style>{CSS}</style>{tune}\n</head><body>\n"
        + "\n".join(o)
        + "\n</body></html>\n"
    )


def cmd_build(args):
    doc = json.load(open(args.data, encoding="utf-8"))
    out = args.out
    if not out:
        base = os.path.splitext(os.path.basename(args.data))[0]
        suffix = "" if args.variant == "full" else "-" + args.variant
        out = os.path.join("build", base + suffix + ".html")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(render(doc, args.variant, args.leading, args.en_size))
    missing = [(p["n"], i) for p in doc.get("paragraphs", [])
               for i, s in enumerate(p.get("sentences", []), 1) if not s.get("ja", "").strip()]
    print(f"{out} を出力しました。")
    if missing and args.variant == "full":
        print("和訳が未記入: " + ", ".join(f"{a}-{b}" for a, b in missing))


def main():
    ap = argparse.ArgumentParser(description="特選プリント・ジェネレータ")
    sub = ap.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("init", help="英文テキスト → JSON 雛形（段落・文に自動分割）")
    i.add_argument("source")
    i.add_argument("-o", "--out")
    i.add_argument("--title")
    i.add_argument("--lesson")
    i.set_defaults(func=cmd_init)

    b = sub.add_parser("build", help="JSON → 印刷用 HTML")
    b.add_argument("data")
    b.add_argument("-o", "--out")
    b.add_argument("--variant", choices=["full", "blank"], default="full",
                   help="full: 和訳入り（既定） / blank: 和訳欄を空罫にした演習用")
    b.add_argument("--leading", help="英文の行送り倍率（既定 3.05）。書き込み欄の高さ")
    b.add_argument("--en-size", dest="en_size", help="英文の級数（既定 11.3pt）")
    b.set_defaults(func=cmd_build)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    sys.exit(main())

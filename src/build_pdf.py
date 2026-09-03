# -*- coding: utf-8 -*-
"""英文法総復習プリント(PDF)を組版する。

    python3 src/build_pdf.py [出力パス]

日本語フォントは IPAゴシック(fonts-japanese-gothic / ipafont-gothic)を
埋め込む。太字ウェイトのある日本語フォントが環境にないため、見出しは
canvas のテキスト描画モード(塗り+輪郭)で疑似ボールドにしている。
"""

import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, KeepTogether,
                               NextPageTemplate, PageBreak, PageTemplate,
                               Paragraph, Spacer, Table, TableStyle)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import SUBTITLE, TITLE, UNITS  # noqa: E402

# --------------------------------------------------------------------- 体裁
PAGE_W, PAGE_H = A4
MARGIN_L = MARGIN_R = 17 * mm
MARGIN_T = 20 * mm
MARGIN_B = 16 * mm
FRAME_W = PAGE_W - MARGIN_L - MARGIN_R

INK = colors.HexColor("#1A1A1A")
ACCENT = colors.HexColor("#1F3864")
ACCENT_LT = colors.HexColor("#4A6FA5")
BOX_BG = colors.HexColor("#F1F5FA")
RULE = colors.HexColor("#C8D2E0")
FAINT = colors.HexColor("#9AA5B4")
ANSWER_BG = colors.HexColor("#F7F7F4")

FONT_CANDIDATES = [
    ("JP", ["/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf",
            "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"]),
    ("JPFix", ["/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
               "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"]),
]


def register_fonts():
    for name, paths in FONT_CANDIDATES:
        for path in paths:
            if os.path.exists(path):
                pdfmetrics.registerFont(TTFont(name, path))
                break
        else:
            raise SystemExit("日本語フォントが見つかりません: %s" % paths)
    # 太字ウェイトが無いので <b> は同じフォントにマップしておく
    pdfmetrics.registerFontFamily("JP", normal="JP", bold="JP",
                                  italic="JP", boldItalic="JP")


register_fonts()

# -------------------------------------------------------------- スタイル定義
def _style(name, **kw):
    base = dict(fontName="JP", fontSize=9.4, leading=15.2, textColor=INK,
                alignment=TA_LEFT, spaceBefore=0, spaceAfter=0)
    base.update(kw)
    return ParagraphStyle(name, **base)


S_LEAD = _style("lead", fontSize=9.2, leading=14.4, textColor=colors.HexColor("#3C4653"))
S_POINT_L = _style("point_l", fontSize=8.8, leading=13.4, textColor=ACCENT)
S_POINT_D = _style("point_d", fontSize=8.9, leading=13.8)
S_Q = _style("q", fontSize=9.6, leading=15.0)
S_CHOICE = _style("choice", fontSize=9.2, leading=14.4,
                  textColor=colors.HexColor("#33383F"))
S_NOTE = _style("note", fontSize=8.4, leading=12.6, textColor=FAINT)
S_ANS_N = _style("ans_n", fontSize=8.6, leading=12.6, textColor=ACCENT)
S_ANS_A = _style("ans_a", fontSize=8.8, leading=12.8, textColor=INK)
S_ANS_E = _style("ans_e", fontSize=8.2, leading=12.4,
                 textColor=colors.HexColor("#5A6472"))

CIRCLED = ["①", "②", "③", "④"]


def esc(text):
    """XMLエスケープしつつ、空所を表す連続スペースの幅を保持する。"""
    text = (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return re.sub(r" {2,}", lambda m: "&nbsp;" * len(m.group(0)), text)


def bold_text(cv, x, y, text, size, color=INK, font="JP", stroke=0.28):
    """太字ウェイトの無いフォントを塗り+輪郭で疑似ボールド描画する。"""
    cv.saveState()
    cv.setFillColor(color)
    cv.setStrokeColor(color)
    cv.setLineWidth(stroke)
    tx = cv.beginText(x, y)
    tx.setFont(font, size)
    tx.setTextRenderMode(2)  # fill then stroke
    tx.textOut(text)
    cv.drawText(tx)
    cv.restoreState()
    return pdfmetrics.stringWidth(text, font, size) + stroke


# ------------------------------------------------------------- Flowable 部品
class UnitHeader(Flowable):
    """単元見出し(番号タイル + タイトル + 下線)。"""

    HEIGHT = 27
    TILE = 21

    def __init__(self, number, title, width=FRAME_W):
        Flowable.__init__(self)
        self.number = number
        self.title = title
        self.width = width
        self.height = self.HEIGHT

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.height

    def draw(self):
        cv = self.canv
        t = self.TILE
        top = self.height
        cv.setFillColor(ACCENT)
        cv.roundRect(0, top - t - 2, t, t, 3, stroke=0, fill=1)
        num = "%02d" % self.number
        nw = pdfmetrics.stringWidth(num, "JP", 10.5)
        bold_text(cv, (t - nw) / 2.0, top - t + 5.2, num, 10.5,
                  color=colors.white, stroke=0.35)
        bold_text(cv, t + 9, top - t + 6.0, self.title, 13.2,
                  color=ACCENT, stroke=0.32)
        cv.setStrokeColor(ACCENT)
        cv.setLineWidth(1.1)
        cv.line(0, 3.5, self.width, 3.5)
        cv.setStrokeColor(RULE)
        cv.setLineWidth(0.5)
        cv.line(0, 1.2, self.width, 1.2)


class SectionLabel(Flowable):
    """問題セクションのラベル(A / B / C ...)。"""

    def __init__(self, tag, caption, width=FRAME_W):
        Flowable.__init__(self)
        self.tag = tag
        self.caption = caption
        self.width = width
        self.height = 15.5

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.height

    def draw(self):
        cv = self.canv
        box = 12.5
        y = self.height - box - 1
        cv.setFillColor(ACCENT_LT)
        cv.roundRect(0, y, box, box, 2, stroke=0, fill=1)
        tw = pdfmetrics.stringWidth(self.tag, "JP", 8.6)
        bold_text(cv, (box - tw) / 2.0, y + 3.4, self.tag, 8.6,
                  color=colors.white, stroke=0.3)
        bold_text(cv, box + 6, y + 3.2, self.caption, 9.6,
                  color=colors.HexColor("#2B3542"), stroke=0.22)


class WriteLine(Flowable):
    """記入用の罫線。"""

    def __init__(self, width=FRAME_W, indent=0, gap=13, lines=1, arrow=False):
        Flowable.__init__(self)
        self.width = width
        self.indent = indent
        self.gap = gap
        self.lines = lines
        self.arrow = arrow
        self.height = gap * lines

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.height

    def draw(self):
        cv = self.canv
        cv.setStrokeColor(colors.HexColor("#D9DEE6"))
        cv.setLineWidth(0.6)
        for i in range(self.lines):
            y = self.height - self.gap * (i + 1) + 3
            x0 = self.indent
            if self.arrow and i == 0:
                cv.setFillColor(FAINT)
                cv.setFont("JP", 8.6)
                cv.drawString(self.indent, y + 2.4, "→")
                x0 = self.indent + 12
            cv.line(x0, y, self.width - 4, y)


def points_table(points):
    rows = []
    for label, desc in points:
        rows.append([Paragraph(esc(label), S_POINT_L),
                     Paragraph(esc(desc), S_POINT_D)])
    tbl = Table(rows, colWidths=[84, FRAME_W - 84 - 22], hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BOX_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, ACCENT_LT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 9),
        ("LEFTPADDING", (1, 0), (1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 3.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.4),
        ("TOPPADDING", (0, 0), (-1, 0), 7),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
    ]))
    return tbl


def numbered(n, body_html, style=S_Q):
    """番号付きの1行を [番号セル, 本文セル] のテーブルで返す。"""
    tbl = Table([[Paragraph('<font color="#1F3864">%d.</font>' % n, style),
                  Paragraph(body_html, style)]],
                colWidths=[19, FRAME_W - 19 - 22], hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return tbl


def choices_row(choices):
    cells = [Paragraph("%s %s" % (CIRCLED[i], esc(c)), S_CHOICE)
             for i, c in enumerate(choices)]
    w = (FRAME_W - 19 - 22) / 4.0
    tbl = Table([cells], colWidths=[w] * 4, hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return Table([[Spacer(19, 1), tbl]],
                 colWidths=[19, FRAME_W - 19 - 22], hAlign="LEFT",
                 style=TableStyle([
                     ("VALIGN", (0, 0), (-1, -1), "TOP"),
                     ("LEFTPADDING", (0, 0), (-1, -1), 0),
                     ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                     ("TOPPADDING", (0, 0), (-1, -1), 0),
                     ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                 ]))


# ------------------------------------------------------------------ 本体組版
def build_unit(unit, index):
    """1単元分の flowable を返す。"""
    flow = [KeepTogether([UnitHeader(index, unit["title"]),
                          Spacer(1, 7),
                          points_table(unit["points"])])]
    flow.append(Spacer(1, 11))

    flow.append(KeepTogether([
        SectionLabel("A", "次の(   )に入る最も適切なものを1つ選びなさい。"),
        Spacer(1, 3),
        numbered(1, esc(unit["mcq"][0][0])),
        choices_row(unit["mcq"][0][1]),
    ]))
    for i, (q, ch, _a, _e) in enumerate(unit["mcq"][1:], start=2):
        flow.append(Spacer(1, 6))
        flow.append(KeepTogether([numbered(i, esc(q)), choices_row(ch)]))

    flow.append(Spacer(1, 10))
    flow.append(KeepTogether([
        SectionLabel("B", "(   )内の語を適切な形に直しなさい。"),
        Spacer(1, 3),
        numbered(6, esc(unit["form"][0][0])),
        WriteLine(indent=19, gap=14, arrow=True),
    ]))
    for i, (q, _a, _e) in enumerate(unit["form"][1:], start=7):
        flow.append(Spacer(1, 3))
        flow.append(KeepTogether([numbered(i, esc(q)),
                                  WriteLine(indent=19, gap=14, arrow=True)]))

    flow.append(Spacer(1, 10))
    flow.append(KeepTogether([
        SectionLabel("C", "次の日本語を英語に直しなさい。"),
        Spacer(1, 3),
        numbered(9, esc(unit["trans"][0][0])),
        WriteLine(indent=19, gap=15, arrow=True),
    ]))
    for i, (jp, _a, _e) in enumerate(unit["trans"][1:], start=10):
        flow.append(Spacer(1, 3))
        flow.append(KeepTogether([numbered(i, esc(jp)),
                                  WriteLine(indent=19, gap=15, arrow=True)]))
    return flow


def answer_rows(unit):
    rows = []
    for i, (_q, ch, a, exp) in enumerate(unit["mcq"], start=1):
        rows.append((i, "%s %s" % (CIRCLED[a], ch[a]), exp))
    for i, (_q, a, exp) in enumerate(unit["form"], start=6):
        rows.append((i, a, exp))
    for i, (_jp, a, exp) in enumerate(unit["trans"], start=9):
        rows.append((i, a, exp))
    return rows


def build_answers():
    flow = []
    for idx, unit in enumerate(UNITS, start=1):
        data = [[Paragraph('<font color="#1F3864">%d</font>' % n, S_ANS_N),
                 Paragraph(esc(a), S_ANS_A),
                 Paragraph(esc(exp), S_ANS_E)]
                for n, a, exp in answer_rows(unit)]
        tbl = Table(data, colWidths=[21, 152, FRAME_W - 21 - 152 - 12],
                    hAlign="LEFT", repeatRows=0)
        style = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEBELOW", (0, 0), (-1, -2), 0.35, RULE),
            ("BACKGROUND", (0, 0), (-1, -1), ANSWER_BG),
            ("LINEBEFORE", (0, 0), (0, -1), 2.2, ACCENT_LT),
        ]
        for r in (4, 7):  # A/B、B/C の切れ目を少し強調
            style.append(("LINEBELOW", (0, r), (-1, r), 0.9, ACCENT_LT))
        tbl.setStyle(TableStyle(style))
        flow.append(KeepTogether([
            AnswerHeading(idx, unit["title"]), Spacer(1, 5), tbl]))
        flow.append(Spacer(1, 13))
    return flow


class AnswerHeading(Flowable):
    def __init__(self, number, title, width=FRAME_W):
        Flowable.__init__(self)
        self.number = number
        self.title = title
        self.width = width
        self.height = 15

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.height

    def draw(self):
        cv = self.canv
        label = "%02d" % self.number
        x = bold_text(cv, 0, 3, label, 10.6, color=ACCENT_LT, stroke=0.3)
        bold_text(cv, x + 8, 3, self.title, 10.6, color=ACCENT, stroke=0.28)


def cover_block():
    flow = []
    flow.append(Spacer(1, 2))
    flow.append(TitleBlock())
    flow.append(Spacer(1, 9))
    flow.append(Paragraph(
        "高校英文法の主要10単元を、要点の確認 → 選択問題 → 語形変化 → 和文英訳の"
        "順で一気に復習するプリントです。各単元10問、全100問。"
        "解答と解説は最終ページ以降にまとめてあります。"
        "まずは何も見ずに解き、答え合わせのあとで要点まとめに戻って確認しましょう。",
        S_LEAD))
    flow.append(Spacer(1, 12))
    return flow


class TitleBlock(Flowable):
    def __init__(self, width=FRAME_W):
        Flowable.__init__(self)
        self.width = width
        self.height = 88

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.height

    def draw(self):
        cv = self.canv
        h = self.height
        cv.setFillColor(ACCENT)
        cv.rect(0, h - 4, 62, 3.2, stroke=0, fill=1)
        bold_text(cv, 0, h - 30, TITLE, 20.5, color=ACCENT, stroke=0.5)
        cv.setFillColor(FAINT)
        cv.setFont("JP", 9.2)
        cv.drawString(1.5, h - 45, SUBTITLE)

        # 氏名・日付・得点欄
        bw, bh = 150, 21
        gap = 10
        x = self.width - (bw * 2 + 66 + gap * 2)
        y = 9
        cv.setStrokeColor(RULE)
        cv.setLineWidth(0.7)
        for label, w in (("氏名", bw), ("日付", bw), ("得点", 66)):
            cv.setFillColor(colors.white)
            cv.rect(x, y, w, bh, stroke=1, fill=1)
            cv.setFillColor(FAINT)
            cv.setFont("JP", 7.6)
            cv.drawString(x + 5, y + bh - 9.5, label)
            if label == "得点":
                cv.setFont("JP", 8.2)
                cv.drawRightString(x + w - 5, y + 5, "/ 100")
            x += w + gap
        cv.setStrokeColor(RULE)
        cv.setLineWidth(0.5)
        cv.line(0, 2, self.width, 2)


class SectionCover(Flowable):
    def __init__(self, text, width=FRAME_W):
        Flowable.__init__(self)
        self.text = text
        self.width = width
        self.height = 40

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.height

    def draw(self):
        cv = self.canv
        cv.setFillColor(ACCENT)
        cv.rect(0, self.height - 4, 46, 3, stroke=0, fill=1)
        bold_text(cv, 0, self.height - 26, self.text, 16.5, color=ACCENT,
                  stroke=0.42)
        cv.setStrokeColor(ACCENT)
        cv.setLineWidth(1.0)
        cv.line(0, 6, self.width, 6)


# ------------------------------------------------------------------ ページ枠
def make_decorator(section_label):
    def decorate(cv, doc):
        cv.saveState()
        cv.setFont("JP", 7.8)
        cv.setFillColor(FAINT)
        cv.drawString(MARGIN_L, PAGE_H - MARGIN_T + 12,
                      "%s ｜ %s" % (TITLE, section_label))
        cv.setStrokeColor(RULE)
        cv.setLineWidth(0.5)
        cv.line(MARGIN_L, PAGE_H - MARGIN_T + 7,
                PAGE_W - MARGIN_R, PAGE_H - MARGIN_T + 7)
        cv.line(MARGIN_L, MARGIN_B - 12, PAGE_W - MARGIN_R, MARGIN_B - 12)
        cv.setFillColor(FAINT)
        cv.drawCentredString(PAGE_W / 2.0, MARGIN_B - 22, "- %d -" % doc.page)
        cv.restoreState()
    return decorate


def build(out_path):
    doc = BaseDocTemplate(
        out_path, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B,
        title=TITLE, author="", subject=SUBTITLE,
        creator="build_pdf.py")
    frame = Frame(MARGIN_L, MARGIN_B, FRAME_W,
                  PAGE_H - MARGIN_T - MARGIN_B, id="body",
                  leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="problems", frames=[frame],
                     onPage=make_decorator("問題編")),
        PageTemplate(id="answers", frames=[frame],
                     onPage=make_decorator("解答・解説")),
    ])

    story = []
    story += cover_block()
    for i, unit in enumerate(UNITS, start=1):
        story += build_unit(unit, i)
        if i < len(UNITS):
            story.append(Spacer(1, 16))
    story.append(NextPageTemplate("answers"))
    story.append(PageBreak())
    story.append(SectionCover("解答・解説"))
    story.append(Spacer(1, 10))
    story += build_answers()

    doc.build(story, canvasmaker=pdfcanvas.Canvas)
    return out_path


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "english_grammar_review.pdf"
    build(target)
    print("wrote %s (%.1f KB)" % (target, os.path.getsize(target) / 1024.0))

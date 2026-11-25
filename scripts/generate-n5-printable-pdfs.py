from __future__ import annotations

import html
import json
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "tmp" / "pdfs" / "n5-mock-1-data.json"
OUTPUT_DIR = ROOT / "output" / "pdf"
PAPER_FILE = OUTPUT_DIR / "japangolearn-n5-mock-1-test-paper.pdf"
ANSWERS_FILE = OUTPUT_DIR / "japangolearn-n5-mock-1-answer-key.pdf"
LOGO_FILE = ROOT / "apps" / "web" / "public" / "logo.png"

PURPLE = colors.HexColor("#6D28D9")
DEEP_PURPLE = colors.HexColor("#24143D")
PINK = colors.HexColor("#DB2777")
TEAL = colors.HexColor("#0891B2")
GOLD = colors.HexColor("#D69E2E")
INK = colors.HexColor("#211A2C")
MUTED = colors.HexColor("#645D6E")
PALE = colors.HexColor("#F6F2FB")
LINE = colors.HexColor("#DED6E8")


def find_font() -> Path:
    candidates = [
        os.environ.get("JGL_PDF_FONT"),
        r"C:\Windows\Fonts\NotoSansJP-VF.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return Path(candidate)
    raise RuntimeError("Set JGL_PDF_FONT to a Japanese-capable TTF/TTC font.")


def register_fonts() -> None:
    font_path = find_font()
    try:
        pdfmetrics.registerFont(TTFont("JGLJP", str(font_path)))
    except Exception:
        pdfmetrics.registerFont(TTFont("JGLJP", str(font_path), subfontIndex=0))


def escaped(value: object) -> str:
    return html.escape(str(value)).replace("\n", "<br/>")


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_brand": ParagraphStyle(
            "CoverBrand",
            parent=base["Normal"],
            fontName="JGLJP",
            fontSize=11,
            leading=15,
            textColor=GOLD,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="JGLJP",
            fontSize=25,
            leading=34,
            textColor=DEEP_PURPLE,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="JGLJP",
            fontSize=10,
            leading=16,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "Heading1JP",
            parent=base["Heading1"],
            fontName="JGLJP",
            fontSize=18,
            leading=24,
            textColor=DEEP_PURPLE,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "Heading2JP",
            parent=base["Heading2"],
            fontName="JGLJP",
            fontSize=12,
            leading=17,
            textColor=PURPLE,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "BodyJP",
            parent=base["BodyText"],
            fontName="JGLJP",
            fontSize=9.2,
            leading=14,
            textColor=INK,
            wordWrap="CJK",
        ),
        "small": ParagraphStyle(
            "SmallJP",
            parent=base["BodyText"],
            fontName="JGLJP",
            fontSize=7.6,
            leading=11,
            textColor=MUTED,
            wordWrap="CJK",
        ),
        "question": ParagraphStyle(
            "QuestionJP",
            parent=base["BodyText"],
            fontName="JGLJP",
            fontSize=10,
            leading=15,
            textColor=INK,
            wordWrap="CJK",
            spaceAfter=4,
        ),
        "choice": ParagraphStyle(
            "ChoiceJP",
            parent=base["BodyText"],
            fontName="JGLJP",
            fontSize=8.8,
            leading=13,
            textColor=INK,
            wordWrap="CJK",
        ),
        "answer": ParagraphStyle(
            "AnswerJP",
            parent=base["BodyText"],
            fontName="JGLJP",
            fontSize=9.2,
            leading=14,
            textColor=colors.HexColor("#17643A"),
            wordWrap="CJK",
        ),
    }


def page_chrome(canvas, doc, label: str):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFont("JGLJP", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, height - 11.5 * mm, f"JapanGoLearn | JLPT N5 | {label}")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.drawString(18 * mm, 10 * mm, "Original practice material - not an official JLPT paper")
    canvas.restoreState()


def document(path: Path, label: str) -> BaseDocTemplate:
    doc = BaseDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=17 * mm,
        title=label,
        author="JapanGoLearn",
        subject="Original JLPT N5 practice material",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="content")
    doc.addPageTemplates(
        [PageTemplate(id="all", frames=[frame], onPage=lambda c, d: page_chrome(c, d, label))]
    )
    return doc


def cover(st, title: str, subtitle: str, details: list[str]):
    items = [Spacer(1, 15 * mm)]
    if LOGO_FILE.exists():
        logo = Image(str(LOGO_FILE), width=28 * mm, height=28 * mm)
        logo.hAlign = "CENTER"
        items.extend([logo, Spacer(1, 7 * mm)])
    items.extend(
        [
            Paragraph("JAPANGOLEARN ORIGINAL", st["cover_brand"]),
            Paragraph(escaped(title), st["cover_title"]),
            Paragraph(escaped(subtitle), st["subtitle"]),
            Spacer(1, 13 * mm),
        ]
    )
    rows = [[Paragraph(escaped(line), st["body"])] for line in details]
    table = Table(rows, colWidths=[145 * mm], hAlign="CENTER")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    items.extend([table, Spacer(1, 12 * mm)])
    name_table = Table(
        [["Name:", "", "Date:", ""], ["Attempt:", "□ First", "□ Practice", "□ Retake"]],
        colWidths=[19 * mm, 64 * mm, 18 * mm, 50 * mm],
    )
    name_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "JGLJP"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LINEBELOW", (1, 0), (1, 0), 0.7, MUTED),
                ("LINEBELOW", (3, 0), (3, 0), 0.7, MUTED),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    items.append(name_table)
    return items


def section_heading(st, section, number: int):
    return [
        Paragraph(f"Section {number}: {escaped(section['title'])}", st["h1"]),
        Paragraph(
            f"{escaped(section['japaneseTitle'])} | {section['durationSeconds'] // 60} minutes | "
            f"{len(section['questions'])} questions",
            st["small"],
        ),
        Spacer(1, 4 * mm),
    ]


def question_block(st, question, number: int, include_solution: bool):
    choice_rows = []
    for index, choice in enumerate(question["choices"]):
        marker = chr(65 + index)
        choice_rows.append([Paragraph(f"<b>{marker}</b>", st["choice"]), Paragraph(escaped(choice), st["choice"])])
    choices = Table(choice_rows, colWidths=[8 * mm, 151 * mm])
    choices.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#FBF9FD")]),
                ("BOX", (0, 0), (-1, -1), 0.35, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    parts = [
        Paragraph(f"<b>{number}.</b> {escaped(question['instruction'])}", st["small"]),
    ]
    if question.get("audioScript") and not include_solution:
        parts.append(Paragraph(f"Audio track: {escaped(question['id'])}", st["small"]))
    if question.get("passage"):
        passage = Table([[Paragraph(escaped(question["passage"]), st["body"])]], colWidths=[159 * mm])
        passage.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), PALE),
                    ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        parts.extend([passage, Spacer(1, 2 * mm)])
    if include_solution and question.get("audioScript"):
        parts.extend(
            [
                Paragraph("Listening transcript", st["h2"]),
                Paragraph(escaped(question["audioScript"]), st["body"]),
                Spacer(1, 2 * mm),
            ]
        )
    parts.extend([Paragraph(escaped(question["prompt"]), st["question"]), choices])
    if include_solution:
        answer_index = question["correctChoice"]
        parts.extend(
            [
                Spacer(1, 2 * mm),
                Paragraph(
                    f"Correct answer: <b>{chr(65 + answer_index)}</b> - "
                    f"{escaped(question['choices'][answer_index])}",
                    st["answer"],
                ),
                Paragraph(f"Explanation: {escaped(question['explanation'])}", st["body"]),
            ]
        )
    parts.append(Spacer(1, 5 * mm))
    return KeepTogether(parts)


def answer_sheet(st, exam):
    questions = [q for section in exam["sections"] for q in section["questions"]]
    cells = []
    for index, question in enumerate(questions, 1):
        choices = "&nbsp;&nbsp;&nbsp;".join(
            f"{chr(65 + i)} ○" for i in range(len(question["choices"]))
        )
        cells.append(Paragraph(f"<b>{index:02d}</b>   {choices}", st["body"]))
    midpoint = (len(cells) + 1) // 2
    rows = []
    for row_index in range(midpoint):
        left = cells[row_index]
        right = cells[row_index + midpoint] if row_index + midpoint < len(cells) else ""
        rows.append([left, right])
    table = Table(rows, colWidths=[80 * mm, 80 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return [Paragraph("Answer sheet", st["h1"]), Paragraph("Mark one answer for each question.", st["small"]), Spacer(1, 4 * mm), table]


def build_paper(exam, st):
    story = cover(
        st,
        exam["title"],
        "Printable test paper",
        [
            "36 original JapanGoLearn questions across vocabulary, grammar/reading, and listening.",
            "Suggested timing: Vocabulary 20 min | Grammar & Reading 40 min | Listening 30 min.",
            "For listening, play the matching audio tracks in the JapanGoLearn mobile app.",
            "Do not open the separate answer key until you finish the paper.",
        ],
    )
    for section_index, section in enumerate(exam["sections"], 1):
        story.append(PageBreak())
        story.extend(section_heading(st, section, section_index))
        for question_index, question in enumerate(section["questions"], 1):
            global_number = sum(len(s["questions"]) for s in exam["sections"][: section_index - 1]) + question_index
            story.append(question_block(st, question, global_number, False))
    story.append(PageBreak())
    story.extend(answer_sheet(st, exam))
    document(PAPER_FILE, "Printable Test Paper").build(story)


def build_answers(exam, st):
    story = cover(
        st,
        f"{exam['title']} Answer Key",
        "Answers, listening transcripts, and explanations",
        [
            "Use this booklet after completing the printable paper or mobile attempt.",
            "Listening transcripts are included for review and shadowing practice.",
            "Scores shown in the app are raw practice scores, not official JLPT scaled results.",
        ],
    )
    for section_index, section in enumerate(exam["sections"], 1):
        story.append(PageBreak())
        story.extend(section_heading(st, section, section_index))
        for question_index, question in enumerate(section["questions"], 1):
            global_number = sum(len(s["questions"]) for s in exam["sections"][: section_index - 1]) + question_index
            story.append(question_block(st, question, global_number, True))
    document(ANSWERS_FILE, "Answer & Explanation Key").build(story)


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Run node scripts/build-n5-exam-pack.mjs first: {DATA_FILE}")
    register_fonts()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    exam = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    st = styles()
    build_paper(exam, st)
    build_answers(exam, st)
    print(f"Created {PAPER_FILE}")
    print(f"Created {ANSWERS_FILE}")


if __name__ == "__main__":
    main()

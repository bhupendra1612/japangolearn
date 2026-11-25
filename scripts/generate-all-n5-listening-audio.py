"""Generate original listening audio for every JapanGoLearn N5 mock.

Development dependency (kept outside the app bundle):
  python -m pip install edge-tts==7.2.7 --target .tmp-audio-tools

Examples:
  python scripts/generate-all-n5-listening-audio.py --mock 2 --mock 3
  python scripts/generate-all-n5-listening-audio.py --force
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / ".tmp-audio-tools"
sys.path.insert(0, str(TOOLS_DIR))

try:
    import edge_tts  # type: ignore[import-not-found]
except ImportError as error:
    raise SystemExit(
        "edge-tts is missing. Install it with: "
        "python -m pip install edge-tts==7.2.7 --target .tmp-audio-tools"
    ) from error


SPEAKER_LABELS = re.compile(r"(?:女の人|男の人|アナウンス|天気よほう)：")
VOICES = ("ja-JP-NanamiNeural", "ja-JP-KeitaNeural")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mock",
        type=int,
        action="append",
        choices=(1, 2, 3),
        help="Generate only this mock number. May be repeated.",
    )
    parser.add_argument("--force", action="store_true", help="Replace existing audio files.")
    return parser.parse_args()


def export_exams() -> list[dict]:
    output = ROOT / "tmp" / "exam-content-for-audio.json"
    subprocess.run(
        ["node", str(ROOT / "scripts" / "export-exam-content.mjs"), str(output)],
        cwd=ROOT,
        check=True,
    )
    return json.loads(output.read_text(encoding="utf-8"))


def spoken_script(script: str) -> str:
    return SPEAKER_LABELS.sub(" ", script).replace("…", "。")


async def generate(selected_mocks: set[int], force: bool) -> None:
    generated = 0
    skipped = 0
    for exam in export_exams():
        match = re.search(r"mock-(\d+)$", exam["id"])
        if not match:
            continue
        mock_number = int(match.group(1))
        if mock_number not in selected_mocks:
            continue
        output_dir = ROOT / "apps" / "mobile" / "assets" / "audio" / f"n5-mock-{mock_number}"
        output_dir.mkdir(parents=True, exist_ok=True)
        listening = next(section for section in exam["sections"] if section["id"] == "listening")
        for index, question in enumerate(listening["questions"]):
            output = output_dir / f"{question['id']}.mp3"
            if output.exists() and not force:
                skipped += 1
                continue
            communicate = edge_tts.Communicate(
                text=spoken_script(question["audioScript"]),
                voice=VOICES[index % len(VOICES)],
                rate="-8%",
            )
            await communicate.save(str(output))
            generated += 1
            print(f"generated {output.relative_to(ROOT)}")
    print(f"Audio complete: {generated} generated, {skipped} existing files kept.")


if __name__ == "__main__":
    args = parse_args()
    mocks = set(args.mock or (1, 2, 3))
    asyncio.run(generate(mocks, args.force))

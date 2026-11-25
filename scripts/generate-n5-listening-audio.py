"""Generate the original JapanGoLearn N5 Mock 1 listening assets.

Development dependency (kept outside the app bundle):
  python -m pip install edge-tts==7.2.7 --target .tmp-audio-tools
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".tmp-audio-tools"))

import edge_tts  # type: ignore[import-not-found]  # noqa: E402


CLIPS = [
    ("n5m1-l01", "りんごを三つください。はい。バナナもいかがですか。いいえ、きょうはりんごだけでいいです。", "ja-JP-NanamiNeural"),
    ("n5m1-l02", "あした、十時に駅でどうですか。十時はちょっと。十一時なら大丈夫です。じゃあ、十一時にしましょう。", "ja-JP-KeitaNeural"),
    ("n5m1-l03", "この箱を部屋へ持って行ってください。その前に、窓を閉めてください。はい、わかりました。", "ja-JP-NanamiNeural"),
    ("n5m1-l04", "きょうは、いい天気ですね。", "ja-JP-KeitaNeural"),
    ("n5m1-l05", "あれ、私の本はどこですか。机の上にはありませんか。ありません。あ、いすの下にありますよ。", "ja-JP-NanamiNeural"),
    ("n5m1-l06", "ご注文は。カレーをお願いします。飲み物は。水でいいです。", "ja-JP-KeitaNeural"),
    ("n5m1-l07", "いってきます。", "ja-JP-NanamiNeural"),
    ("n5m1-l08", "遅くなってすみません。電車が止まりました。大変でしたね。バスで来たんですか。はい。", "ja-JP-KeitaNeural"),
    ("n5m1-l09", "大阪へ行く電車は二番線です。京都へ行く電車は四番線です。お間違えのないようにご注意ください。", "ja-JP-NanamiNeural"),
    ("n5m1-l10", "午後から雨になります。出かける人は傘を持って行ってください。", "ja-JP-KeitaNeural"),
    ("n5m1-l11", "このスーパーは朝九時に開きます。土曜日だけは八時半に開きます。", "ja-JP-NanamiNeural"),
    ("n5m1-l12", "お名前は何ですか。", "ja-JP-KeitaNeural"),
    ("n5m1-l13", "この紙を三枚コピーして、田中さんの机の上に置いてください。はい。", "ja-JP-NanamiNeural"),
    ("n5m1-l14", "金曜日に病院へ行きますか。金曜日は仕事があります。木曜日に行きます。", "ja-JP-KeitaNeural"),
    ("n5m1-l15", "肉のお弁当と魚のお弁当があります。じゃあ、魚のお弁当を一つください。", "ja-JP-NanamiNeural"),
    ("n5m1-l16", "病院はどこですか。銀行の隣です。郵便局の前ではありません。", "ja-JP-KeitaNeural"),
    ("n5m1-l17", "すみません、足を踏みました。", "ja-JP-NanamiNeural"),
    ("n5m1-l18", "日曜日の朝、テニスをしませんか。いいですね。午後は勉強しますから、朝にしましょう。", "ja-JP-KeitaNeural"),
    ("n5m1-l19", "図書館からのお知らせです。今日は午後六時に閉まります。本を借りる人は五時半までに来てください。", "ja-JP-NanamiNeural"),
    ("n5m1-l20", "妹のプレゼントに赤いかばんをください。すみません、赤はありません。青ならあります。では、青をください。", "ja-JP-KeitaNeural"),
]


async def generate() -> None:
    output_dir = ROOT / "apps" / "mobile" / "assets" / "audio" / "n5-mock-1"
    output_dir.mkdir(parents=True, exist_ok=True)
    for clip_id, text, voice in CLIPS:
        output = output_dir / f"{clip_id}.mp3"
        communicate = edge_tts.Communicate(text=text, voice=voice, rate="-8%")
        await communicate.save(str(output))
        print(f"generated {output.relative_to(ROOT)}")


if __name__ == "__main__":
    asyncio.run(generate())

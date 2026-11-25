-- The 33 additional loanword sounds in the official foreign-word tables:
-- 32 small-kana combinations and standalone ヴ (not an extra basic alphabet).
-- https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/gairai/honbun01.html
-- https://kotoba.ninjal.ac.jp/qa/yokuaru/qa-195/
-- Hindi readings are pronunciation aids, not exact phonetic transcriptions.
-- Preserve all existing kana IDs and learner progress; insert missing rows only.
insert into public.kana
  (character, romaji, romaji_hindi, type, group_name, stroke_count, stroke_hint,
   sort_order, is_dakuten, is_combo)
select entry.character, entry.romaji, entry.hindi, 'katakana', 'loanword',
       entry.strokes,
       case when char_length(entry.character) = 1 then 'ウ + dakuten (゛)'
            else left(entry.character, 1) || ' + small ' || right(entry.character, 1) end,
       entry.position, entry.marked, char_length(entry.character) > 1
from (values
  ('イェ', 'ye',  'ये',   5, 105, false),
  ('ウィ', 'wi',  'वि',   5, 106, false),
  ('ウェ', 'we',  'वे',   6, 107, false),
  ('ウォ', 'wo',  'वो',   6, 108, false),
  ('シェ', 'she', 'शे',   6, 109, false),
  ('ジェ', 'je',  'जे',   8, 110, true),
  ('チェ', 'che', 'चे',   6, 111, false),
  ('ツァ', 'tsa', 'त्सा', 5, 112, false),
  ('ツィ', 'tsi', 'त्सि', 5, 113, false),
  ('ツェ', 'tse', 'त्से', 6, 114, false),
  ('ツォ', 'tso', 'त्सो', 6, 115, false),
  ('ティ', 'ti',  'ति',   5, 116, false),
  ('ディ', 'di',  'दि',   7, 117, true),
  ('トゥ', 'tu',  'तु',   5, 118, false),
  ('ドゥ', 'du',  'दु',   7, 119, true),
  ('テュ', 'tyu', 'त्यु', 5, 120, false),
  ('デュ', 'dyu', 'द्यु', 7, 121, true),
  ('ファ', 'fa',  'फ़ा',  3, 122, false),
  ('フィ', 'fi',  'फ़ि',  3, 123, false),
  ('フェ', 'fe',  'फ़े',  4, 124, false),
  ('フォ', 'fo',  'फ़ो',  4, 125, false),
  ('フュ', 'fyu', 'फ़्यु', 3, 126, false),
  ('ヴ',   'vu',  'वु',   5, 127, true),
  ('ヴァ', 'va',  'वा',   7, 128, true),
  ('ヴィ', 'vi',  'वि',   7, 129, true),
  ('ヴェ', 've',  'वे',   8, 130, true),
  ('ヴォ', 'vo',  'वो',   8, 131, true),
  ('ヴュ', 'vyu', 'व्यु', 7, 132, true),
  ('クァ', 'kwa', 'क्वा', 4, 133, false),
  ('クィ', 'kwi', 'क्वि', 4, 134, false),
  ('クェ', 'kwe', 'क्वे', 5, 135, false),
  ('クォ', 'kwo', 'क्वो', 5, 136, false),
  ('グァ', 'gwa', 'ग्वा', 6, 137, true)
) as entry(character, romaji, hindi, strokes, position, marked)
where not exists (
  select 1 from public.kana existing
  where existing.type = 'katakana' and existing.character = entry.character
);

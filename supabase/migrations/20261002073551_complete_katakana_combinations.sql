-- Complete the 33 standard yoon combinations without replacing existing IDs.
-- The Hiragana chart already contains all 104 beginner entries.
insert into public.kana
  (character, romaji, romaji_hindi, type, group_name, stroke_count, stroke_hint,
   sort_order, is_dakuten, is_combo)
select missing.* from (values
  ('ギュ', 'gyu', 'ग्यु', 'katakana', 'combo', 7, 'ギ + small ュ', 94, true, true),
  ('ギョ', 'gyo', 'ग्यो', 'katakana', 'combo', 7, 'ギ + small ョ', 95, true, true),
  ('ビュ', 'byu', 'ब्यु', 'katakana', 'combo', 6, 'ビ + small ュ', 100, true, true),
  ('ビョ', 'byo', 'ब्यो', 'katakana', 'combo', 6, 'ビ + small ョ', 101, true, true),
  ('ピュ', 'pyu', 'प्यु', 'katakana', 'combo', 5, 'ピ + small ュ', 103, true, true),
  ('ピョ', 'pyo', 'प्यो', 'katakana', 'combo', 5, 'ピ + small ョ', 104, true, true)
) as missing(character, romaji, romaji_hindi, type, group_name, stroke_count,
             stroke_hint, sort_order, is_dakuten, is_combo)
where not exists (
  select 1 from public.kana existing
  where existing.type = missing.type and existing.character = missing.character
);

-- Keep related sounds together, including for clients that order in SQL.
update public.kana as kana
set sort_order = 71 + chart.position::integer
from unnest(array[
  'キャ','キュ','キョ','シャ','シュ','ショ','チャ','チュ','チョ',
  'ニャ','ニュ','ニョ','ヒャ','ヒュ','ヒョ','ミャ','ミュ','ミョ',
  'リャ','リュ','リョ','ギャ','ギュ','ギョ','ジャ','ジュ','ジョ',
  'ビャ','ビュ','ビョ','ピャ','ピュ','ピョ'
]) with ordinality as chart(character, position)
where kana.type = 'katakana' and kana.character = chart.character
  and kana.sort_order is distinct from 71 + chart.position::integer;

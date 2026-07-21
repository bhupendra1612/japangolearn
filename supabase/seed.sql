insert into public.jlpt_levels (
  id, level, name, title, description, order_index, sort_order,
  total_kanji, total_vocabulary, total_grammar, color
)
values
  ('N5', 'N5', 'N5', 'Beginner', 'Foundational Japanese for everyday situations.', 1, 1, 100, 800, 50, '#22c55e'),
  ('N4', 'N4', 'N4', 'Elementary', 'Elementary grammar, vocabulary and kanji.', 2, 2, 300, 1500, 150, '#3b82f6'),
  ('N3', 'N3', 'N3', 'Intermediate', 'Intermediate reading and conversation.', 3, 3, 650, 3750, 350, '#8b5cf6'),
  ('N2', 'N2', 'N2', 'Upper Intermediate', 'Professional and academic Japanese.', 4, 4, 1000, 6000, 600, '#f59e0b'),
  ('N1', 'N1', 'N1', 'Advanced', 'Advanced comprehension and expression.', 5, 5, 2000, 10000, 900, '#ef4444')
on conflict (id) do update
set
  name = excluded.name,
  title = excluded.title,
  description = excluded.description,
  order_index = excluded.order_index,
  sort_order = excluded.sort_order,
  total_kanji = excluded.total_kanji,
  total_vocabulary = excluded.total_vocabulary,
  total_grammar = excluded.total_grammar,
  color = excluded.color;

insert into public.vocabulary (kanji, hiragana, romaji, romaji_hindi, english, topic, jlpt_level, icon)
values
  ('一', 'いち', 'ichi', 'इचि', 'one', 'Numbers', 'N5', '1'),
  ('二', 'に', 'ni', 'नि', 'two', 'Numbers', 'N5', '2'),
  ('三', 'さん', 'san', 'सान', 'three', 'Numbers', 'N5', '3'),
  ('四', 'よん', 'yon', 'योन', 'four', 'Numbers', 'N5', '4'),
  ('五', 'ご', 'go', 'गो', 'five', 'Numbers', 'N5', '5')
on conflict do nothing;

insert into public.grammar_patterns (
  title, pattern, structure, meaning, explanation, examples, jlpt_level, category, order_index
)
values
  (
    'A is B',
    'A は B です',
    'Noun は Noun です',
    'A is B',
    'Use は to mark the topic and です for a polite statement.',
    '[{"japanese":"わたしは学生です。","english":"I am a student."}]'::jsonb,
    'N5',
    'Basics',
    1
  )
on conflict do nothing;

insert into public.kana (
  character, romaji, romaji_hindi, type, group_name, stroke_count, stroke_hint, sort_order
)
values
  ('あ', 'a', 'आ', 'hiragana', 'vowels', 3, 'Start with the upper-left curve.', 1),
  ('い', 'i', 'ई', 'hiragana', 'vowels', 2, 'Two flowing vertical strokes.', 2),
  ('う', 'u', 'ऊ', 'hiragana', 'vowels', 2, 'Short top mark, then the main curve.', 3),
  ('え', 'e', 'ए', 'hiragana', 'vowels', 2, 'Short top mark, then the lower form.', 4),
  ('お', 'o', 'ओ', 'hiragana', 'vowels', 3, 'Horizontal, curved vertical, final mark.', 5)
on conflict (character, type) do nothing;

insert into public.achievements (id, name, description, icon, xp_reward, category, condition)
values
  ('first_steps', 'First Steps', 'Complete your first learning attempt.', '🌱', 0, 'learning', '{"type":"activities","threshold":1}'::jsonb),
  ('century', 'Century', 'Earn 100 total XP.', '💯', 0, 'milestone', '{"type":"xp","threshold":100}'::jsonb),
  ('seven_day_streak', 'Seven Day Streak', 'Practice for seven consecutive days.', '🔥', 0, 'streak', '{"type":"streak","threshold":7}'::jsonb)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  xp_reward = excluded.xp_reward,
  category = excluded.category,
  condition = excluded.condition;

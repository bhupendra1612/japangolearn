alter table public.practice_list_items
  drop constraint if exists practice_list_items_item_type_check;

alter table public.practice_list_items
  add constraint practice_list_items_item_type_check
  check (item_type in ('vocabulary', 'kana', 'kanji', 'grammar', 'listening'));

comment on column public.practice_list_items.item_type is
  'Practice content kind: vocabulary, kana, kanji, grammar, or locally-authored listening question.';

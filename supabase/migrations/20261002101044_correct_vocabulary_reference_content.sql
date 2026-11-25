-- Verified reference-content corrections. Keep every ID and learner reference.
-- Sources: JMdict entries via JapanDict:
-- https://www.japandict.com/緑 , https://www.japandict.com/黄色
-- https://www.japandict.com/六百 , https://www.japandict.com/辞書
-- https://www.japandict.com/未だ , https://www.japandict.com/もう
update public.vocabulary set hiragana = 'みどり', romaji = 'midori', romaji_hindi = 'मिदोरि'
where kanji = '緑' and hiragana = 'みどりいろ' and romaji = 'midoriro';

update public.vocabulary set kanji = '黄色', hiragana = 'きいろ', romaji = 'kiiro', romaji_hindi = 'कीइरो'
where kanji = '黄' and hiragana = 'きいろい' and english = 'Yellow';

update public.vocabulary set romaji = 'roppyaku', romaji_hindi = 'रोप्प्याकु'
where kanji = '六百' and hiragana = 'ろっぴゃく' and romaji = 'ropphyaku';

update public.vocabulary set romaji = 'jisho', english = 'Dictionary', romaji_hindi = 'जिशो'
where kanji = '辞書' and hiragana = 'じしょ' and romaji = 'jisho2' and english = 'Word / Vocabulary';

update public.vocabulary set topic = 'Adverbs'
where topic = 'Conjunctions' and hiragana in ('まだ', 'もう');

-- These are people/relationships, rather than family members.
update public.vocabulary set topic = 'Pronouns & People'
where topic = 'Family' and kanji in ('友達','親友','仲間','同僚','上司','部下','先生','学生','隣人','恋人');

-- An imported Romaji placeholder is not a Hindi pronunciation. Leave it absent
-- until a Hindi reading is supplied, rather than teaching mislabeled content.
update public.vocabulary set romaji_hindi = ''
where romaji_hindi is not null and romaji_hindi !~ '[ऀ-ॿ]';

import { MASTERY_ITEM_TYPES, type MasteryItemType } from "./learning";

export type PracticeListStudyRow = {
  id: string;
  item_type: string;
  item_id: number;
  mastery_score: number;
  last_reviewed: string | null;
};

export type PracticeContentRows = {
  vocabulary: readonly {
    id: number;
    kanji: string | null;
    hiragana: string;
    english: string;
    romaji?: string | null;
    romaji_hindi?: string | null;
  }[];
  kana: readonly {
    id: number;
    character: string;
    romaji: string;
    romaji_hindi?: string | null;
    type?: string | null;
  }[];
  kanji: readonly {
    id: number;
    character: string;
    hiragana: string | null;
    meaning_en: readonly string[];
    romaji?: string | null;
    meaning_hi?: readonly string[] | null;
  }[];
  grammar: readonly {
    id: number;
    title: string;
    pattern: string;
    meaning: string;
  }[];
};

export type PracticeStudyItem = {
  listItemId: string;
  itemType: MasteryItemType;
  itemId: string;
  front: string;
  back: string;
  correctAnswer: string;
  audioText: string;
  reading?: string;
  romaji?: string;
  romajiHindi?: string;
  english?: string;
  meaningHindi?: string;
  kanaType?: "hiragana" | "katakana";
  masteryScore: number;
  lastReviewed: string | null;
};

type CardContent = Omit<
  PracticeStudyItem,
  "listItemId" | "itemType" | "itemId" | "masteryScore" | "lastReviewed"
>;

function isMasteryItemType(value: string): value is MasteryItemType {
  return MASTERY_ITEM_TYPES.includes(value as MasteryItemType);
}

function addContent(
  content: Map<string, CardContent>,
  itemType: MasteryItemType,
  itemId: number,
  card: CardContent
) {
  if (!card.front || !card.back || !card.correctAnswer) return;
  content.set(`${itemType}:${itemId}`, card);
}

export function buildPracticeStudyItems(
  listItems: readonly PracticeListStudyRow[],
  rows: PracticeContentRows
): PracticeStudyItem[] {
  const content = new Map<string, CardContent>();

  for (const row of rows.vocabulary) {
    const front = (row.kanji?.trim() || row.hiragana.trim()).trim();
    const answer = row.english.trim();
    addContent(content, "vocabulary", row.id, {
      front,
      back: answer,
      correctAnswer: answer,
      audioText: row.hiragana.trim() || front,
      reading: row.kanji ? row.hiragana.trim() || undefined : undefined,
      romaji: row.romaji?.trim() || undefined,
      romajiHindi: row.romaji_hindi?.trim() || undefined,
      english: answer,
    });
  }

  for (const row of rows.kana) {
    const front = row.character.trim();
    const answer = row.romaji.trim();
    addContent(content, "kana", row.id, {
      front,
      back: answer,
      correctAnswer: answer,
      audioText: front,
      romaji: row.romaji.trim() || undefined,
      romajiHindi: row.romaji_hindi?.trim() || undefined,
      kanaType: row.type === "hiragana" || row.type === "katakana" ? row.type : undefined,
    });
  }

  for (const row of rows.kanji) {
    const front = row.character.trim();
    const meanings = row.meaning_en.map((meaning) => meaning.trim()).filter(Boolean);
    const answer = meanings.join(", ");
    const hindiMeanings = (row.meaning_hi ?? []).map((meaning) => meaning.trim()).filter(Boolean);
    addContent(content, "kanji", row.id, {
      front,
      back: answer,
      correctAnswer: answer,
      audioText: row.hiragana?.trim() || front,
      reading: row.hiragana?.trim() || undefined,
      romaji: row.romaji?.trim() || undefined,
      english: answer,
      meaningHindi: hindiMeanings.join(", ") || undefined,
    });
  }

  for (const row of rows.grammar) {
    const front = (row.pattern.trim() || row.title.trim()).trim();
    const answer = row.meaning.trim();
    addContent(content, "grammar", row.id, {
      front,
      back: answer,
      correctAnswer: answer,
      audioText: front,
      english: answer,
    });
  }

  return listItems.flatMap((listItem) => {
    if (!isMasteryItemType(listItem.item_type)) return [];
    const card = content.get(`${listItem.item_type}:${listItem.item_id}`);
    if (!card) return [];

    return [
      {
        listItemId: listItem.id,
        itemType: listItem.item_type,
        itemId: String(listItem.item_id),
        ...card,
        masteryScore: listItem.mastery_score,
        lastReviewed: listItem.last_reviewed,
      },
    ];
  });
}

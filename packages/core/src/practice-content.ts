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
  }[];
  kana: readonly {
    id: number;
    character: string;
    romaji: string;
  }[];
  kanji: readonly {
    id: number;
    character: string;
    hiragana: string;
    meaning_en: readonly string[];
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
      audioText: front,
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
    });
  }

  for (const row of rows.kanji) {
    const front = row.character.trim();
    const meanings = row.meaning_en.map((meaning) => meaning.trim()).filter(Boolean);
    const answer = meanings.join(", ");
    addContent(content, "kanji", row.id, {
      front,
      back: answer,
      correctAnswer: answer,
      audioText: row.hiragana.trim() || front,
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

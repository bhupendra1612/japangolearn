import { N5_MOCK_2, N5_MOCK_3 } from "./exam-additional-content";

export type ExamSectionId = "vocabulary" | "grammar-reading" | "listening";

export type ExamQuestion = {
  id: string;
  sectionId: ExamSectionId;
  skill: string;
  instruction: string;
  prompt: string;
  choices: readonly string[];
  correctChoice: number;
  explanation: string;
  passage?: string;
  audioScript?: string;
};

export type ExamSection = {
  id: ExamSectionId;
  title: string;
  shortTitle: string;
  japaneseTitle: string;
  durationSeconds: number;
  color: string;
  icon: "language" | "document-text" | "headset";
  questions: readonly ExamQuestion[];
};

export type ExamDefinition = {
  id: string;
  title: string;
  level: "N5";
  version: number;
  sections: readonly ExamSection[];
};

const vocabularyQuestions: readonly ExamQuestion[] = [
  {
    id: "n5m1-v01",
    sectionId: "vocabulary",
    skill: "Kanji reading",
    instruction: "Choose the correct reading for the underlined word.",
    prompt: "まいあさ 六時 に おきます。",
    choices: ["ろくじ", "ななじ", "くじ", "よじ"],
    correctChoice: 0,
    explanation: "六時 is read ろくじ and means six o'clock.",
  },
  {
    id: "n5m1-v02",
    sectionId: "vocabulary",
    skill: "Kanji reading",
    instruction: "Choose the correct reading for the underlined word.",
    prompt: "きょうは 雨 です。",
    choices: ["ゆき", "くも", "あめ", "かぜ"],
    correctChoice: 2,
    explanation: "雨 is read あめ and means rain.",
  },
  {
    id: "n5m1-v03",
    sectionId: "vocabulary",
    skill: "Orthography",
    instruction: "Choose the kanji that matches the hiragana word.",
    prompt: "えき で ともだちに あいました。",
    choices: ["駅", "店", "道", "門"],
    correctChoice: 0,
    explanation: "えき is written 駅 and means station.",
  },
  {
    id: "n5m1-v04",
    sectionId: "vocabulary",
    skill: "Word meaning",
    instruction: "Choose the best word for the sentence.",
    prompt: "この かばんは ＿＿＿ です。たくさん はいりません。",
    choices: ["おおきい", "ちいさい", "あたらしい", "おもい"],
    correctChoice: 1,
    explanation: "Because not much fits inside, ちいさい (small) is the best answer.",
  },
  {
    id: "n5m1-v05",
    sectionId: "vocabulary",
    skill: "Word meaning",
    instruction: "Choose the best word for the sentence.",
    prompt: "あついですから、まどを ＿＿＿ ください。",
    choices: ["あけて", "しめて", "けして", "つけて"],
    correctChoice: 0,
    explanation: "まどを あけて means open the window.",
  },
  {
    id: "n5m1-v06",
    sectionId: "vocabulary",
    skill: "Paraphrase",
    instruction: "Choose the sentence with nearly the same meaning.",
    prompt: "きのうの えいがは おもしろくなかったです。",
    choices: [
      "きのうの えいがは たのしかったです。",
      "きのうの えいがは つまらなかったです。",
      "きのう えいがを みませんでした。",
      "きのうの えいがは ながくなかったです。",
    ],
    correctChoice: 1,
    explanation: "おもしろくなかった and つまらなかった both mean it was not interesting.",
  },
  {
    id: "n5m1-v07",
    sectionId: "vocabulary",
    skill: "Usage",
    instruction: "Choose the sentence where the word is used correctly.",
    prompt: "『かりる』",
    choices: [
      "としょかんで ほんを かりました。",
      "ともだちに ほんを かりました。",
      "ほんやで ほんを かりました。",
      "せんせいへ ほんを かりました。",
    ],
    correctChoice: 0,
    explanation: "かりる means to borrow; a library is a natural place to borrow a book.",
  },
  {
    id: "n5m1-v08",
    sectionId: "vocabulary",
    skill: "Context vocabulary",
    instruction: "Choose the best word for the sentence.",
    prompt: "でんしゃが きません。もう じゅっぷん ＿＿＿ います。",
    choices: ["あそんで", "まって", "あるいて", "はたらいて"],
    correctChoice: 1,
    explanation: "まって います means have been waiting.",
  },
];

const grammarReadingQuestions: readonly ExamQuestion[] = [
  {
    id: "n5m1-g01",
    sectionId: "grammar-reading",
    skill: "Particles",
    instruction: "Choose the best answer for the blank.",
    prompt: "わたしは バス ＿＿＿ がっこうへ いきます。",
    choices: ["を", "で", "に", "が"],
    correctChoice: 1,
    explanation: "で marks the means of transportation: バスで.",
  },
  {
    id: "n5m1-g02",
    sectionId: "grammar-reading",
    skill: "Verb forms",
    instruction: "Choose the best answer for the blank.",
    prompt: "ここで しゃしんを ＿＿＿ も いいですか。",
    choices: ["とる", "とって", "とった", "とり"],
    correctChoice: 1,
    explanation: "The permission pattern is て-form + もいいですか.",
  },
  {
    id: "n5m1-g03",
    sectionId: "grammar-reading",
    skill: "Adjectives",
    instruction: "Choose the best answer for the blank.",
    prompt: "この へやは しずか ＿＿＿ きれいです。",
    choices: ["で", "に", "を", "と"],
    correctChoice: 0,
    explanation: "The て-form of a な-adjective uses で: しずかで.",
  },
  {
    id: "n5m1-g04",
    sectionId: "grammar-reading",
    skill: "Sentence order",
    instruction: "Choose the phrase that correctly completes the sentence.",
    prompt: "日曜日に いっしょに ＿＿＿ か。",
    choices: ["えいがを みません", "えいがが みません", "えいがを みました", "えいがに みません"],
    correctChoice: 0,
    explanation: "Verb-negative + か is a polite invitation: みませんか.",
  },
  {
    id: "n5m1-g05",
    sectionId: "grammar-reading",
    skill: "Grammar in context",
    instruction: "Choose the best answer for the blank.",
    prompt: "A: 田中さんは どこですか。 B: いま でんわを ＿＿＿。",
    choices: ["します", "して います", "しました", "しません"],
    correctChoice: 1,
    explanation: "して います describes an action in progress now.",
  },
  {
    id: "n5m1-r01",
    sectionId: "grammar-reading",
    skill: "Short passage",
    instruction: "Read the message and answer the question.",
    passage:
      "山田さんへ\nきょうの べんきょう会は 三時からです。いつもの きょうしつは つかえませんから、二かいの 205きょうしつに 来てください。\nさとう",
    prompt: "山田さんは どこへ 行きますか。",
    choices: ["いつもの きょうしつ", "205きょうしつ", "さとうさんの いえ", "としょかん"],
    correctChoice: 1,
    explanation: "The message says to come to room 205 on the second floor.",
  },
  {
    id: "n5m1-r02",
    sectionId: "grammar-reading",
    skill: "Short passage",
    instruction: "Read the passage and answer the question.",
    passage:
      "わたしは まいあさ 七時に うちを 出ます。えきまで あるいて 十分です。七時十五分の でんしゃに のります。雨の 日は バスで えきへ 行きます。",
    prompt: "雨の 日、どうやって えきへ 行きますか。",
    choices: ["あるいて", "じてんしゃで", "バスで", "でんしゃで"],
    correctChoice: 2,
    explanation: "The final sentence says 雨の日はバスで駅へ行きます.",
  },
  {
    id: "n5m1-r03",
    sectionId: "grammar-reading",
    skill: "Information retrieval",
    instruction: "Read the notice and answer the question.",
    passage:
      "さくらプール\n月〜金: 9:00–20:00\n土: 10:00–18:00\n日: やすみ\nおとな 500円・こども 300円",
    prompt: "正しいものは どれですか。",
    choices: [
      "日曜日も およげます。",
      "土曜日は 九時からです。",
      "こどもは 三百円です。",
      "おとなは 三百円です。",
    ],
    correctChoice: 2,
    explanation: "The notice lists the child price as 300 yen.",
  },
];

const listeningQuestions: readonly ExamQuestion[] = [
  {
    id: "n5m1-l01",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose what the woman will buy.",
    prompt: "女の人は 何を 買いますか。",
    audioScript:
      "女の人：すみません、りんごを 三つ ください。男の人：はい。バナナも いかがですか。女の人：いいえ、きょうは りんごだけで いいです。",
    choices: ["りんごだけ", "バナナだけ", "りんごと バナナ", "何も 買いません"],
    correctChoice: 0,
    explanation: "She asks for three apples and says she only needs apples today.",
  },
  {
    id: "n5m1-l02",
    sectionId: "listening",
    skill: "Key-point listening",
    instruction: "Listen and choose the meeting time.",
    prompt: "二人は 何時に 会いますか。",
    audioScript:
      "男の人：あした、十時に えきで どうですか。女の人：十時は ちょっと…。十一時なら だいじょうぶです。男の人：じゃ、十一時に しましょう。",
    choices: ["九時", "十時", "十一時", "十二時"],
    correctChoice: 2,
    explanation: "They agree to meet at eleven.",
  },
  {
    id: "n5m1-l03",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose what the man does first.",
    prompt: "男の人は まず 何を しますか。",
    audioScript:
      "女の人：この はこを へやへ もって 行ってください。そのまえに、まどを しめてください。男の人：はい、わかりました。",
    choices: ["はこを あけます", "まどを しめます", "へやを そうじします", "はこを かいます"],
    correctChoice: 1,
    explanation: "She says to close the window before carrying the box.",
  },
  {
    id: "n5m1-l04",
    sectionId: "listening",
    skill: "Verbal response",
    instruction: "Listen and choose the most natural response.",
    prompt: "どう こたえますか。",
    audioScript: "きょうは いい てんきですね。",
    choices: [
      "はい、そうですね。",
      "いいえ、てんきです。",
      "きょうへ 行きます。",
      "どういたしまして。",
    ],
    correctChoice: 0,
    explanation: "はい、そうですね is the natural agreement.",
  },
  {
    id: "n5m1-l05",
    sectionId: "listening",
    skill: "Key-point listening",
    instruction: "Listen and choose where the book is.",
    prompt: "本は どこに ありますか。",
    audioScript:
      "男の人：あれ、わたしの 本は どこですか。女の人：つくえの 上には ありませんか。男の人：ありません。女の人：あ、いすの 下に ありますよ。",
    choices: ["つくえの 上", "つくえの 下", "いすの 上", "いすの 下"],
    correctChoice: 3,
    explanation: "The woman finds it under the chair.",
  },
  {
    id: "n5m1-l06",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose what the woman orders.",
    prompt: "女の人は 何を たのみますか。",
    audioScript:
      "男の人：ごちゅうもんは。女の人：カレーを おねがいします。男の人：のみものは。女の人：水で いいです。",
    choices: ["カレーと 水", "カレーと おちゃ", "パンと 水", "何も たのみません"],
    correctChoice: 0,
    explanation: "She orders curry and says water is fine.",
  },
  {
    id: "n5m1-l07",
    sectionId: "listening",
    skill: "Verbal response",
    instruction: "Listen and choose the most natural response.",
    prompt: "どう こたえますか。",
    audioScript: "いってきます。",
    choices: ["いってらっしゃい。", "ただいま。", "おかえりなさい。", "いただきます。"],
    correctChoice: 0,
    explanation: "The standard response to いってきます is いってらっしゃい.",
  },
  {
    id: "n5m1-l08",
    sectionId: "listening",
    skill: "Key-point listening",
    instruction: "Listen and choose why the man is late.",
    prompt: "男の人は どうして おそく なりましたか。",
    audioScript:
      "男の人：おそく なって すみません。でんしゃが とまりました。女の人：たいへんでしたね。バスで 来たんですか。男の人：はい。",
    choices: [
      "ねぼうしました",
      "でんしゃが とまりました",
      "バスが ありませんでした",
      "みちが わかりませんでした",
    ],
    correctChoice: 1,
    explanation: "He says the train stopped, so he became late.",
  },
  {
    id: "n5m1-l09",
    sectionId: "listening",
    skill: "Information listening",
    instruction: "Listen and choose the correct platform.",
    prompt: "大阪へ 行く 電車は 何番線ですか。",
    audioScript:
      "アナウンス：大阪へ 行く 電車は 二番線です。京都へ 行く 電車は 四番線です。おまちがえの ないように ごちゅういください。",
    choices: ["一番線", "二番線", "三番線", "四番線"],
    correctChoice: 1,
    explanation: "The announcement says the train for Osaka leaves from platform two.",
  },
  {
    id: "n5m1-l10",
    sectionId: "listening",
    skill: "Key-point listening",
    instruction: "Listen and choose what people should take.",
    prompt: "出かける 人は 何を もって 行きますか。",
    audioScript: "天気よほう：午後から 雨に なります。出かける 人は かさを もって 行ってください。",
    choices: ["ぼうし", "かさ", "コート", "水"],
    correctChoice: 1,
    explanation: "The forecast says it will rain and tells people to take an umbrella.",
  },
  {
    id: "n5m1-l11",
    sectionId: "listening",
    skill: "Information listening",
    instruction: "Listen and choose Saturday's opening time.",
    prompt: "土曜日、スーパーは 何時に あきますか。",
    audioScript: "女の人：この スーパーは 朝 九時に あきます。土曜日だけは 八時半に あきます。",
    choices: ["八時", "八時半", "九時", "九時半"],
    correctChoice: 1,
    explanation: "The supermarket opens at 8:30 only on Saturdays.",
  },
  {
    id: "n5m1-l12",
    sectionId: "listening",
    skill: "Verbal response",
    instruction: "Listen and choose the most natural response.",
    prompt: "どう こたえますか。",
    audioScript: "お名前は 何ですか。",
    choices: ["二十さいです。", "山田です。", "学生です。", "日本です。"],
    correctChoice: 1,
    explanation: "The speaker asks for a name, so 山田です is the natural response.",
  },
  {
    id: "n5m1-l13",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose what the man does after copying.",
    prompt: "男の人は コピーの あと、何を しますか。",
    audioScript:
      "女の人：この 紙を 三枚 コピーして、田中さんの つくえの 上に おいてください。男の人：はい。",
    choices: [
      "紙を すてます",
      "田中さんに 電話します",
      "紙を つくえに おきます",
      "紙を 三枚 かいます",
    ],
    correctChoice: 2,
    explanation: "After making three copies, he should put them on Tanaka's desk.",
  },
  {
    id: "n5m1-l14",
    sectionId: "listening",
    skill: "Key-point listening",
    instruction: "Listen and choose the day the woman will visit the hospital.",
    prompt: "女の人は いつ 病院へ 行きますか。",
    audioScript:
      "男の人：金曜日に 病院へ 行きますか。女の人：金曜日は 仕事が あります。木曜日に 行きます。",
    choices: ["水曜日", "木曜日", "金曜日", "土曜日"],
    correctChoice: 1,
    explanation: "She has work on Friday, so she will go on Thursday.",
  },
  {
    id: "n5m1-l15",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose the lunch order.",
    prompt: "女の人は どの おべんとうを 買いますか。",
    audioScript:
      "男の人：肉の おべんとうと 魚の おべんとうが あります。女の人：じゃあ、魚の おべんとうを 一つ ください。",
    choices: ["肉を 一つ", "魚を 一つ", "肉を 二つ", "魚を 二つ"],
    correctChoice: 1,
    explanation: "She orders one fish lunch box.",
  },
  {
    id: "n5m1-l16",
    sectionId: "listening",
    skill: "Location listening",
    instruction: "Listen and choose where the hospital is.",
    prompt: "病院は どこですか。",
    audioScript:
      "女の人：病院は どこですか。男の人：銀行の となりです。ゆうびんきょくの 前では ありません。",
    choices: ["銀行の となり", "銀行の 前", "ゆうびんきょくの となり", "ゆうびんきょくの 中"],
    correctChoice: 0,
    explanation: "The hospital is next to the bank.",
  },
  {
    id: "n5m1-l17",
    sectionId: "listening",
    skill: "Verbal response",
    instruction: "Listen and choose the most natural response.",
    prompt: "どう こたえますか。",
    audioScript: "すみません、足を ふみました。",
    choices: [
      "いいえ、だいじょうぶです。",
      "おめでとうございます。",
      "いただきます。",
      "しつれいします。",
    ],
    correctChoice: 0,
    explanation: "The speaker apologizes, so saying it is okay is the natural response.",
  },
  {
    id: "n5m1-l18",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose what they will do Sunday morning.",
    prompt: "二人は 日曜日の 朝、何を しますか。",
    audioScript:
      "男の人：日曜日の 朝、テニスを しませんか。女の人：いいですね。午後は べんきょうしますから、朝に しましょう。",
    choices: ["テニス", "べんきょう", "買いもの", "仕事"],
    correctChoice: 0,
    explanation: "They agree to play tennis on Sunday morning and study in the afternoon.",
  },
  {
    id: "n5m1-l19",
    sectionId: "listening",
    skill: "Information listening",
    instruction: "Listen and choose when borrowers should arrive.",
    prompt: "本を かりる 人は 何時までに 行きますか。",
    audioScript:
      "アナウンス：図書館からの おしらせです。今日は 午後 六時に しまります。本を かりる 人は 五時半までに 来てください。",
    choices: ["五時", "五時半", "六時", "六時半"],
    correctChoice: 1,
    explanation: "The library closes at six, but borrowers must arrive by 5:30.",
  },
  {
    id: "n5m1-l20",
    sectionId: "listening",
    skill: "Task-based listening",
    instruction: "Listen and choose the bag the woman buys.",
    prompt: "女の人は 何色の かばんを 買いますか。",
    audioScript:
      "女の人：妹の プレゼントに 赤い かばんを ください。男の人：すみません、赤は ありません。青なら あります。女の人：では、青を ください。",
    choices: ["赤", "青", "白", "黒"],
    correctChoice: 1,
    explanation: "Red is unavailable, so she chooses the blue bag.",
  },
];

export const N5_MOCK_1: ExamDefinition = {
  id: "jgl-n5-mock-1",
  title: "JapanGoLearn N5 Mock 1",
  level: "N5",
  version: 2,
  sections: [
    {
      id: "vocabulary",
      title: "Vocabulary",
      shortTitle: "Vocab",
      japaneseTitle: "文字・語彙",
      durationSeconds: 20 * 60,
      color: "#7C3AED",
      icon: "language",
      questions: vocabularyQuestions,
    },
    {
      id: "grammar-reading",
      title: "Grammar & Reading",
      shortTitle: "Grammar",
      japaneseTitle: "文法・読解",
      durationSeconds: 40 * 60,
      color: "#0891B2",
      icon: "document-text",
      questions: grammarReadingQuestions,
    },
    {
      id: "listening",
      title: "Listening",
      shortTitle: "Listening",
      japaneseTitle: "聴解",
      durationSeconds: 30 * 60,
      color: "#DB2777",
      icon: "headset",
      questions: listeningQuestions,
    },
  ],
};

export { N5_MOCK_2, N5_MOCK_3 };

export const N5_MOCKS: readonly ExamDefinition[] = [N5_MOCK_1, N5_MOCK_2, N5_MOCK_3];

export const EXAM_SECTIONS = N5_MOCK_1.sections;

export function getExamDefinition(examId: string | undefined): ExamDefinition | undefined {
  return N5_MOCKS.find((exam) => exam.id === examId);
}

export function getExamSection(
  sectionId: string | undefined,
  examId: string | undefined = N5_MOCK_1.id
): ExamSection | undefined {
  return getExamDefinition(examId)?.sections.find((section) => section.id === sectionId);
}

export function getExamQuestion(questionId: string, examId?: string): ExamQuestion | undefined {
  const exams = examId ? [getExamDefinition(examId)].filter(Boolean) : N5_MOCKS;
  return exams
    .flatMap((exam) => exam?.sections ?? [])
    .flatMap((section) => section.questions)
    .find((question) => question.id === questionId);
}

export function getListeningPracticeItemId(questionId: string): number | undefined {
  const match = /^n5m([1-3])-l(\d{2})$/.exec(questionId);
  if (!match) return undefined;
  const mockNumber = Number(match[1]);
  const questionNumber = Number(match[2]);
  return Number.isInteger(questionNumber) ? 5000 + mockNumber * 100 + questionNumber : undefined;
}

export function getListeningQuestionByPracticeItemId(itemId: number): ExamQuestion | undefined {
  const mockNumber = Math.floor((itemId - 5000) / 100);
  const questionNumber = itemId - (5000 + mockNumber * 100);
  if (mockNumber < 1 || mockNumber > 3 || questionNumber < 1 || questionNumber > 99) {
    return undefined;
  }
  return getExamQuestion(`n5m${mockNumber}-l${String(questionNumber).padStart(2, "0")}`);
}

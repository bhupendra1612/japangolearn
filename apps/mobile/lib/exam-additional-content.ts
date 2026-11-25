import type { ExamDefinition, ExamQuestion, ExamSection, ExamSectionId } from "./exam-content";

type QuestionExtra = Pick<ExamQuestion, "passage" | "audioScript">;

function question(
  id: string,
  sectionId: ExamSectionId,
  skill: string,
  instruction: string,
  prompt: string,
  choices: readonly string[],
  correctChoice: number,
  explanation: string,
  extra: Partial<QuestionExtra> = {}
): ExamQuestion {
  return {
    id,
    sectionId,
    skill,
    instruction,
    prompt,
    choices,
    correctChoice,
    explanation,
    ...extra,
  };
}

const sectionInstruction = {
  reading: "Choose the correct reading for the underlined word.",
  orthography: "Choose the kanji that matches the hiragana word.",
  word: "Choose the best word for the sentence.",
  paraphrase: "Choose the sentence with nearly the same meaning.",
  usage: "Choose the sentence where the word is used correctly.",
  grammar: "Choose the best answer for the blank.",
  passage: "Read the passage and answer the question.",
} as const;

const mock2Vocabulary: readonly ExamQuestion[] = [
  question("n5m2-v01", "vocabulary", "Kanji reading", sectionInstruction.reading, "先生は きょうしつに います。", ["せんせい", "せんぜい", "せいせん", "せいぜん"], 0, "先生 is read せんせい and means teacher."),
  question("n5m2-v02", "vocabulary", "Kanji reading", sectionInstruction.reading, "月曜日に テストが あります。", ["かようび", "すいようび", "げつようび", "もくようび"], 2, "月曜日 is read げつようび and means Monday."),
  question("n5m2-v03", "vocabulary", "Orthography", sectionInstruction.orthography, "あした びょういんへ 行きます。", ["病気", "病院", "銀行", "学校"], 1, "びょういん is written 病院 and means hospital."),
  question("n5m2-v04", "vocabulary", "Word meaning", sectionInstruction.word, "この カレーは とても ＿＿＿ です。水を ください。", ["あまい", "からい", "ぬるい", "やすい"], 1, "Needing water after curry suggests からい, meaning spicy."),
  question("n5m2-v05", "vocabulary", "Context vocabulary", sectionInstruction.word, "雨ですから、＿＿＿を もって 行きます。", ["かさ", "さいふ", "めがね", "かぎ"], 0, "かさ means umbrella, which is needed when it rains."),
  question("n5m2-v06", "vocabulary", "Paraphrase", sectionInstruction.paraphrase, "すぐ うちへ かえります。", ["いま うちへ かえります。", "あとで うちへ かえります。", "ゆっくり うちへ かえります。", "あした うちへ かえります。"], 0, "すぐ means right away, so いま is the closest meaning."),
  question("n5m2-v07", "vocabulary", "Usage", sectionInstruction.usage, "『しめる』", ["さむいですから、まどを しめます。", "へやの でんきを しめます。", "くつを しめます。", "テレビを しめます。"], 0, "A window or door can be closed with しめる."),
  question("n5m2-v08", "vocabulary", "Context vocabulary", sectionInstruction.word, "でんしゃに かさを ＿＿＿。", ["なくしました", "おぼえました", "ならいました", "あらいました"], 0, "なくしました means lost; losing an umbrella on a train is natural here."),
];

const mock2GrammarReading: readonly ExamQuestion[] = [
  question("n5m2-g01", "grammar-reading", "Particles", sectionInstruction.grammar, "ともだち ＿＿＿ てがみを かきました。", ["を", "に", "で", "と"], 1, "に marks the recipient of the letter."),
  question("n5m2-g02", "grammar-reading", "Verb forms", sectionInstruction.grammar, "夏休みに 北海道へ ＿＿＿ です。", ["行くたい", "行きたい", "行ってたい", "行ったい"], 1, "The desire form is the verb stem plus たい: 行きたいです."),
  question("n5m2-g03", "grammar-reading", "Adjectives", sectionInstruction.grammar, "きのうは とても ＿＿＿ です。", ["さむいでした", "さむかった", "さむくでした", "さむくない"], 1, "The past affirmative of さむい is さむかったです."),
  question("n5m2-g04", "grammar-reading", "Connectors", sectionInstruction.grammar, "あした テストが あります ＿＿＿、今晩 べんきょうします。", ["から", "まで", "でも", "しか"], 0, "から gives the reason: because there is a test tomorrow."),
  question("n5m2-g05", "grammar-reading", "Comparison", sectionInstruction.grammar, "でんしゃは バス ＿＿＿ はやいです。", ["ほど", "より", "から", "まで"], 1, "A より B pattern compares A with B: faster than the bus."),
  question("n5m2-r01", "grammar-reading", "Information retrieval", sectionInstruction.passage, "この 図書館は いつ 休みですか。", ["月曜日", "火曜日", "土曜日", "日曜日"], 0, "The notice states that the library is closed on Mondays.", { passage: "みどり図書館\n火〜金 9:00–19:00\n土・日 10:00–17:00\n月曜日は 休みです。" }),
  question("n5m2-r02", "grammar-reading", "Short message", sectionInstruction.passage, "二人は どこで 会いますか。", ["駅の 西口", "駅の 東口", "映画館の 中", "レストランの 前"], 1, "Mika changes the meeting place to the station's east exit.", { passage: "リーさんへ\n土曜日の 映画は 二時からです。一時半に 駅の 東口で 会いましょう。映画館の 前は 人が 多いです。\nみか" }),
  question("n5m2-r03", "grammar-reading", "Short passage", sectionInstruction.passage, "ケンさんは どうして ケーキを 買いますか。", ["きょうは 安いから", "妹の たんじょうびだから", "自分で 食べたいから", "母に たのまれたから"], 1, "The passage says tomorrow is his younger sister's birthday.", { passage: "ケンさんは 仕事の あとで ケーキ屋へ 行きます。あしたは 妹の たんじょうびです。妹は いちごの ケーキが すきです。" }),
];

const mock2Listening: readonly ExamQuestion[] = [
  question("n5m2-l01", "listening", "Task-based listening", "Listen and choose what the woman does first.", "女の人は まず 何を しますか。", ["皿を あらいます", "野菜を きります", "テーブルを ふきます", "買いものに 行きます"], 2, "She is told to wipe the table before cutting vegetables.", { audioScript: "男の人：野菜を きって ください。そのまえに、テーブルを ふいて ください。女の人：はい。" }),
  question("n5m2-l02", "listening", "Key-point listening", "Listen and choose the bus time.", "女の人は 何時の バスに のりますか。", ["七時十分", "七時二十分", "七時半", "八時"], 1, "The 7:10 bus is too early, so she chooses 7:20.", { audioScript: "男の人：七時十分の バスで 行きますか。女の人：それは はやいです。七時二十分の バスに します。" }),
  question("n5m2-l03", "listening", "Location listening", "Listen and choose where the keys are.", "かぎは どこに ありますか。", ["かばんの 中", "つくえの 上", "コートの ポケット", "げんかん"], 2, "The woman remembers putting them in her coat pocket.", { audioScript: "女の人：かぎが ありません。かばんの 中にも つくえの 上にも ありません。あ、コートの ポケットに ありました。" }),
  question("n5m2-l04", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["はい、おねがいします。", "いいえ、のみます。", "ごちそうさま。", "おかえりなさい。"], 0, "はい、おねがいします naturally accepts the offer.", { audioScript: "コーヒーを もう 一ぱい いかがですか。" }),
  question("n5m2-l05", "listening", "Information listening", "Listen and choose the room number.", "日本語の クラスは 何番の へやですか。", ["百二", "二百一", "二百十", "三百一"], 1, "The announcement places Japanese class in room 201.", { audioScript: "アナウンス：日本語の クラスは 二かいの 二百一です。英語の クラスは 三百一です。" }),
  question("n5m2-l06", "listening", "Task-based listening", "Listen and choose what the man buys.", "男の人は 何を 買いますか。", ["白い シャツ", "青い シャツ", "白い セーター", "青い セーター"], 1, "The white shirt is unavailable in his size, so he buys blue.", { audioScript: "男の人：この 白い シャツ、エルサイズは ありますか。女の人：白は ありませんが、青は あります。男の人：じゃあ、青を ください。" }),
  question("n5m2-l07", "listening", "Key-point listening", "Listen and choose why the woman cannot go.", "女の人は どうして 行きませんか。", ["仕事が あります", "かぜを ひきました", "お金が ありません", "家族が 来ます"], 3, "Her parents are visiting on Sunday.", { audioScript: "男の人：日曜日、いっしょに 山へ 行きませんか。女の人：すみません。日曜日は ちちと ははが うちへ 来ます。" }),
  question("n5m2-l08", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["おだいじに。", "いただきます。", "いってきます。", "はじめまして。"], 0, "おだいじに is said to someone who is ill.", { audioScript: "きのうから かぜを ひいて います。" }),
  question("n5m2-l09", "listening", "Task-based listening", "Listen and choose the drink order.", "女の人は 何を のみますか。", ["つめたい お茶", "あたたかい お茶", "コーヒー", "水"], 1, "She asks for warm tea rather than cold tea.", { audioScript: "男の人：つめたい お茶で いいですか。女の人：今日は さむいですから、あたたかい お茶を おねがいします。" }),
  question("n5m2-l10", "listening", "Information listening", "Listen and choose the closing time.", "店は 今日 何時に しまりますか。", ["五時", "六時", "七時", "八時"], 1, "The store normally closes at seven but closes at six today.", { audioScript: "アナウンス：いつもは 七時までですが、今日は 六時に 店を しめます。" }),
  question("n5m2-l11", "listening", "Key-point listening", "Listen and choose today's weather.", "今日の 午後は どんな 天気ですか。", ["晴れ", "雨", "雪", "くもり"], 1, "It is sunny now, but rain is forecast for the afternoon.", { audioScript: "天気よほう：今は 晴れて いますが、午後から 雨に なるでしょう。" }),
  question("n5m2-l12", "listening", "Task-based listening", "Listen and choose what the man takes.", "男の人は 何を もって 行きますか。", ["じしょ", "ノート", "えんぴつ", "パソコン"], 3, "He is told he does not need a dictionary but should bring a computer.", { audioScript: "女の人：あしたの クラスに じしょは いりません。パソコンを もって 来てください。男の人：わかりました。" }),
  question("n5m2-l13", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["どうぞ おはいりください。", "しつれいしました。", "ただいま。", "おやすみなさい。"], 0, "どうぞ おはいりください invites the visitor to enter.", { audioScript: "ごめんください。" }),
  question("n5m2-l14", "listening", "Location listening", "Listen and choose where the post office is.", "ゆうびんきょくは どこですか。", ["銀行の 右", "銀行の 左", "コンビニの 右", "駅の 中"], 1, "It is on the left of the bank.", { audioScript: "女の人：ゆうびんきょくは どこですか。男の人：あの 銀行の 左です。右は コンビニです。" }),
  question("n5m2-l15", "listening", "Task-based listening", "Listen and choose Saturday's plan.", "二人は 土曜日に 何を しますか。", ["公園へ 行きます", "映画を 見ます", "買いものを します", "うちで べんきょうします"], 1, "They change from the rainy park plan to a movie.", { audioScript: "男の人：土曜日、公園へ 行きませんか。女の人：雨ですよ。映画は どうですか。男の人：いいですね。" }),
  question("n5m2-l16", "listening", "Key-point listening", "Listen and choose the number of tickets.", "男の人は きっぷを 何枚 買いますか。", ["一枚", "二枚", "三枚", "四枚"], 2, "He buys one for himself and two for friends, three total.", { audioScript: "女の人：きっぷは 何枚ですか。男の人：わたしのと、ともだち 二人のです。三枚 ください。" }),
  question("n5m2-l17", "listening", "Task-based listening", "Listen and choose what the woman should not do.", "女の人は 何を しては いけませんか。", ["水を のむ", "薬を のむ", "車を うんてんする", "早く ねる"], 2, "The medicine may cause sleepiness, so she must not drive.", { audioScript: "男の人：この 薬を のんだ あとは、ねむく なりますから、車を うんてんしないで ください。女の人：はい。" }),
  question("n5m2-l18", "listening", "Information listening", "Listen and choose the train platform.", "東京へ 行く 電車は 何番線ですか。", ["三番線", "四番線", "五番線", "六番線"], 2, "The Tokyo train has moved from platform four to platform five.", { audioScript: "アナウンス：東京へ 行く 電車は、四番線では ありません。五番線から 出ます。" }),
  question("n5m2-l19", "listening", "Key-point listening", "Listen and choose the woman's lunch.", "女の人は 昼ごはんに 何を 食べましたか。", ["パン", "カレー", "うどん", "おべんとう"], 2, "She wanted curry but the shop was closed, so she ate udon.", { audioScript: "男の人：昼は カレーでしたか。女の人：カレーの 店は 休みでしたから、うどんを 食べました。" }),
  question("n5m2-l20", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["こちらこそ。", "だいじょうぶですか。", "おじゃまします。", "ごちそうさま。"], 0, "こちらこそ is a natural reply to thanks.", { audioScript: "今日は どうも ありがとうございました。" }),
];

const mock3Vocabulary: readonly ExamQuestion[] = [
  question("n5m3-v01", "vocabulary", "Kanji reading", sectionInstruction.reading, "午前 九時から はたらきます。", ["ごぜん", "ごご", "ごせん", "ごまえ"], 0, "午前 is read ごぜん and means a.m."),
  question("n5m3-v02", "vocabulary", "Kanji reading", sectionInstruction.reading, "日曜日に 山へ 行きました。", ["かわ", "うみ", "やま", "そら"], 2, "山 is read やま and means mountain."),
  question("n5m3-v03", "vocabulary", "Orthography", sectionInstruction.orthography, "あとで でんわを します。", ["電気", "電話", "天気", "会話"], 1, "でんわ is written 電話 and means telephone."),
  question("n5m3-v04", "vocabulary", "Word meaning", sectionInstruction.word, "この じてんしゃは 十年前のです。とても ＿＿＿ です。", ["ふるい", "わかい", "ひくい", "ほそい"], 0, "ふるい means old and fits a ten-year-old bicycle."),
  question("n5m3-v05", "vocabulary", "Context vocabulary", sectionInstruction.word, "へやを 出る とき、でんきを ＿＿＿ ください。", ["つけて", "けして", "あけて", "かして"], 1, "でんきを けす means to turn off the light."),
  question("n5m3-v06", "vocabulary", "Paraphrase", sectionInstruction.paraphrase, "今日は いそがしいです。", ["今日は 時間が ありません。", "今日は 仕事が ありません。", "今日は 元気では ありません。", "今日は ひまです。"], 0, "Being busy means having little or no free time."),
  question("n5m3-v07", "vocabulary", "Usage", sectionInstruction.usage, "『つくる』", ["母は まいにち ばんごはんを つくります。", "駅まで 電車を つくります。", "本を 一時間 つくります。", "友だちに 電話を つくります。"], 0, "Food can naturally be made with つくる."),
  question("n5m3-v08", "vocabulary", "Context vocabulary", sectionInstruction.word, "さいふを ＿＿＿。こうばんへ 行きます。", ["なくしました", "ならべました", "かえしました", "あびました"], 0, "なくしました means lost, explaining a visit to the police box."),
];

const mock3GrammarReading: readonly ExamQuestion[] = [
  question("n5m3-g01", "grammar-reading", "Particles", sectionInstruction.grammar, "これは 兄 ＿＿＿ カメラです。", ["が", "を", "の", "で"], 2, "の marks possession: my older brother's camera."),
  question("n5m3-g02", "grammar-reading", "Invitations", sectionInstruction.grammar, "いっしょに 昼ごはんを ＿＿＿ か。", ["食べます", "食べません", "食べました", "食べないです"], 1, "The polite invitation pattern uses the negative form: 食べませんか."),
  question("n5m3-g03", "grammar-reading", "Past tense", sectionInstruction.grammar, "きのうは 日曜日 ＿＿＿。", ["です", "でした", "では ありません", "であります"], 1, "The polite past of です is でした."),
  question("n5m3-g04", "grammar-reading", "Adverbs", sectionInstruction.grammar, "A：もう レポートを 書きましたか。B：いいえ、＿＿＿ です。", ["また", "まだ", "いつも", "とても"], 1, "まだです means not yet."),
  question("n5m3-g05", "grammar-reading", "Superlatives", sectionInstruction.grammar, "スポーツで サッカーが ＿＿＿ すきです。", ["もっと", "いちばん", "あまり", "ぜんぜん"], 1, "いちばん marks soccer as the favourite among sports."),
  question("n5m3-r01", "grammar-reading", "Information retrieval", sectionInstruction.passage, "びんと かんは いつ 出しますか。", ["月曜日", "火曜日", "木曜日", "金曜日"], 2, "The notice assigns bottles and cans to Thursday.", { passage: "ごみの 日\n月・金：もえる ごみ\n火：紙と ダンボール\n木：びんと かん\n朝 八時までに 出してください。" }),
  question("n5m3-r02", "grammar-reading", "Short passage", sectionInstruction.passage, "まゆみさんは 京都で 何を しましたか。", ["海で およぎました", "お寺を 見ました", "買いものだけ しました", "友だちと 仕事を しました"], 1, "She visited two temples before shopping.", { passage: "まゆみさんは 先週、友だちと 京都へ 行きました。午前中に お寺を 二つ 見ました。午後は 駅の 近くで 買いものを しました。" }),
  question("n5m3-r03", "grammar-reading", "Short message", sectionInstruction.passage, "学生は 火曜日に 何を もって 来ますか。", ["赤い ペン", "日本語の 本", "食べもの", "写真"], 3, "The teacher asks students to bring one family photo.", { passage: "日本語クラスの みなさんへ\n火曜日は 家族について 話します。家族の 写真を 一枚 もって 来てください。本は いりません。\n田中先生" }),
];

const mock3Listening: readonly ExamQuestion[] = [
  question("n5m3-l01", "listening", "Task-based listening", "Listen and choose what the man does first.", "男の人は まず 何を しますか。", ["メールを 送ります", "電話を します", "会議へ 行きます", "紙を コピーします"], 3, "He must copy the document before the meeting.", { audioScript: "女の人：この 紙を コピーしてから、会議の へやへ 来てください。男の人：はい、すぐ します。" }),
  question("n5m3-l02", "listening", "Key-point listening", "Listen and choose the meeting day.", "二人は いつ 会いますか。", ["火曜日", "水曜日", "木曜日", "金曜日"], 2, "Wednesday is busy, so they agree on Thursday.", { audioScript: "男の人：水曜日に 会えますか。女の人：水曜日は いそがしいです。木曜日なら だいじょうぶです。男の人：では、木曜日に。" }),
  question("n5m3-l03", "listening", "Location listening", "Listen and choose where the cat is.", "ねこは どこに いますか。", ["ベッドの 上", "ベッドの 下", "いすの 上", "そとの 庭"], 1, "The cat comes in from the garden and hides under the bed.", { audioScript: "女の人：ねこは 庭ですか。男の人：いま へやに 入りました。ベッドの 下に いますよ。" }),
  question("n5m3-l04", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["ただいま。", "おかえりなさい。", "いってらっしゃい。", "おじゃまします。"], 1, "おかえりなさい is the standard reply to ただいま.", { audioScript: "ただいま。" }),
  question("n5m3-l05", "listening", "Information listening", "Listen and choose the price.", "ノートは 一さつ いくらですか。", ["百円", "百五十円", "二百円", "二百五十円"], 1, "Two notebooks cost 300 yen, so one is 150 yen.", { audioScript: "男の人：この ノートは 二さつで 三百円です。一さつなら 百五十円です。" }),
  question("n5m3-l06", "listening", "Task-based listening", "Listen and choose the fruit the woman buys.", "女の人は 何を 買いますか。", ["みかん", "りんご", "バナナ", "いちご"], 0, "Apples are expensive today, so she chooses mandarins.", { audioScript: "女の人：りんごを ください。男の人：今日は りんごが 高いですよ。みかんは 安いです。女の人：じゃあ、みかんに します。" }),
  question("n5m3-l07", "listening", "Key-point listening", "Listen and choose why the man walks.", "男の人は どうして あるいて 行きますか。", ["バスが ありません", "駅が 近いです", "お金が ありません", "天気が いいです"], 1, "The station is only five minutes away, so he walks.", { audioScript: "女の人：駅まで バスで 行きますか。男の人：いいえ、ここから 五分ですから、あるいて 行きます。" }),
  question("n5m3-l08", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["はい、どうぞ。", "いいえ、読みません。", "本です。", "そうでした。"], 0, "はい、どうぞ gives permission to borrow the book.", { audioScript: "この 本を かりても いいですか。" }),
  question("n5m3-l09", "listening", "Information listening", "Listen and choose the class start time.", "クラスは 何時に はじまりますか。", ["九時", "九時十五分", "九時半", "十時"], 2, "The teacher is late, so class starts at 9:30 instead of 9:00.", { audioScript: "アナウンス：先生が おくれます。九時の クラスは 九時半から はじめます。" }),
  question("n5m3-l10", "listening", "Task-based listening", "Listen and choose what the woman takes off.", "女の人は 何を ぬぎますか。", ["くつ", "コート", "ぼうし", "めがね"], 0, "She is asked to remove her shoes before entering.", { audioScript: "男の人：この へやに 入る とき、くつを ぬいで ください。女の人：はい、わかりました。" }),
  question("n5m3-l11", "listening", "Key-point listening", "Listen and choose the woman's age.", "女の人は 何さいですか。", ["十八さい", "十九さい", "二十さい", "二十一さい"], 2, "She was 19 last year and is now 20.", { audioScript: "男の人：十九さいですか。女の人：それは 去年です。先月 二十さいに なりました。" }),
  question("n5m3-l12", "listening", "Information listening", "Listen and choose tomorrow's temperature.", "あしたは 何度ですか。", ["十度", "十五度", "二十度", "二十五度"], 2, "Today's high is 15 degrees and tomorrow will reach 20.", { audioScript: "天気よほう：今日は 十五度でした。あしたは あたたかく なって、二十度に なるでしょう。" }),
  question("n5m3-l13", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["いただきます。", "ごちそうさまでした。", "おだいじに。", "しつれいします。"], 1, "ごちそうさまでした is said after finishing a meal.", { audioScript: "もう ごはんは おわりましたか。" }),
  question("n5m3-l14", "listening", "Task-based listening", "Listen and choose the gift.", "男の人は 何を プレゼントしますか。", ["花", "本", "おかし", "時計"], 2, "She already has many books, so he chooses sweets.", { audioScript: "男の人：山田さんの プレゼント、本は どうですか。女の人：本は たくさん ありますよ。おかしが いいと 思います。男の人：そう しましょう。" }),
  question("n5m3-l15", "listening", "Location listening", "Listen and choose where the restroom is.", "トイレは どこですか。", ["エレベーターの 前", "エレベーターの となり", "かいだんの 下", "店の そと"], 1, "It is beside the elevator.", { audioScript: "女の人：すみません、トイレは どこですか。男の人：あの エレベーターの となりです。" }),
  question("n5m3-l16", "listening", "Task-based listening", "Listen and choose what the woman sends.", "女の人は 何を 送りますか。", ["大きい はこを 一つ", "小さい はこを 一つ", "大きい はこを 二つ", "手紙を 二つ"], 0, "She sends the one large box and carries the small one herself.", { audioScript: "男の人：この はこを 二つとも 送りますか。女の人：いいえ、大きい はこだけ おねがいします。小さいのは もって 帰ります。" }),
  question("n5m3-l17", "listening", "Key-point listening", "Listen and choose when the man studies Japanese.", "男の人は いつ 日本語を べんきょうしますか。", ["朝", "昼休み", "仕事の あと", "週末だけ"], 2, "He studies for an hour after work.", { audioScript: "女の人：朝、日本語を べんきょうしますか。男の人：朝は 時間が ありません。仕事の あとで 一時間 べんきょうします。" }),
  question("n5m3-l18", "listening", "Information listening", "Listen and choose what is closed.", "今日は どこが 休みですか。", ["一かいの 店", "二かいの レストラン", "三かいの 映画館", "ぜんぶ"], 1, "Only the second-floor restaurant is closed today.", { audioScript: "アナウンス：一かいの 店と 三かいの 映画館は あいて います。二かいの レストランは 今日 休みです。" }),
  question("n5m3-l19", "listening", "Task-based listening", "Listen and choose what the man should buy.", "男の人は 何を 買いますか。", ["たまごと 牛乳", "パンと 牛乳", "たまごと パン", "牛乳だけ"], 0, "There is bread at home, so he only needs eggs and milk.", { audioScript: "女の人：スーパーで たまごと 牛乳を 買って ください。パンは うちに あります。男の人：わかりました。" }),
  question("n5m3-l20", "listening", "Verbal response", "Listen and choose the most natural response.", "どう こたえますか。", ["はい、わかりました。", "いいえ、雨です。", "おめでとうございます。", "こちらこそ。"], 0, "はい、わかりました acknowledges the instruction.", { audioScript: "この へやでは 大きい こえで 話さないで ください。" }),
];

function buildSections(
  vocabulary: readonly ExamQuestion[],
  grammarReading: readonly ExamQuestion[],
  listening: readonly ExamQuestion[]
): readonly ExamSection[] {
  return [
    { id: "vocabulary", title: "Vocabulary", shortTitle: "Vocab", japaneseTitle: "文字・語彙", durationSeconds: 20 * 60, color: "#7C3AED", icon: "language", questions: vocabulary },
    { id: "grammar-reading", title: "Grammar & Reading", shortTitle: "Grammar", japaneseTitle: "文法・読解", durationSeconds: 40 * 60, color: "#0891B2", icon: "document-text", questions: grammarReading },
    { id: "listening", title: "Listening", shortTitle: "Listening", japaneseTitle: "聴解", durationSeconds: 30 * 60, color: "#DB2777", icon: "headset", questions: listening },
  ];
}

export const N5_MOCK_2: ExamDefinition = {
  id: "jgl-n5-mock-2",
  title: "JapanGoLearn N5 Mock 2",
  level: "N5",
  version: 1,
  sections: buildSections(mock2Vocabulary, mock2GrammarReading, mock2Listening),
};

export const N5_MOCK_3: ExamDefinition = {
  id: "jgl-n5-mock-3",
  title: "JapanGoLearn N5 Mock 3",
  level: "N5",
  version: 1,
  sections: buildSections(mock3Vocabulary, mock3GrammarReading, mock3Listening),
};

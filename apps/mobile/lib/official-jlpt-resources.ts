const OFFICIAL_JLPT_ORIGIN = "https://www.jlpt.jp";

export const OFFICIAL_JLPT_SOURCE_URL = `${OFFICIAL_JLPT_ORIGIN}/e/samples/sampleindex.html`;
export const OFFICIAL_JLPT_POLICY_URL = `${OFFICIAL_JLPT_ORIGIN}/e/policy.html`;

export type OfficialPdf = {
  id: string;
  title: string;
  description: string;
  group: "Test sections" | "Review materials";
  url: string;
};

export type OfficialCollection = {
  id: string;
  label: string;
  title: string;
  year: number;
  pdfs: OfficialPdf[];
};

const PDF_DOCUMENTS = [
  { id: "vocabulary", title: "Vocabulary", description: "Language knowledge · words and characters", group: "Test sections", filename: "N5V.pdf" },
  { id: "grammar", title: "Grammar", description: "Language knowledge · grammar questions", group: "Test sections", filename: "N5G.pdf" },
  { id: "reading", title: "Reading", description: "Reading comprehension questions", group: "Test sections", filename: "N5R.pdf" },
  { id: "listening", title: "Listening", description: "Listening question booklet · audio on source page", group: "Test sections", filename: "N5L.pdf" },
  { id: "answer-sheet", title: "Sample answer sheet", description: "See the official answer sheet format", group: "Review materials", filename: "N5sheet.pdf" },
  { id: "answers", title: "Answers", description: "Official answer key for this collection", group: "Review materials", filename: "N5answer.pdf" },
  { id: "listening-script", title: "Listening script", description: "Transcript for the listening questions", group: "Review materials", filename: "N5script.pdf" },
] as const;

function makeCollection(year: 2018 | 2012): OfficialCollection {
  return {
    id: String(year),
    label: year === 2018 ? "2018 · Vol. 2" : "2012 · Workbook",
    title: year === 2018 ? "Official Practice Workbook Vol. 2" : "Official Practice Workbook",
    year,
    pdfs: PDF_DOCUMENTS.map((document) => ({
      id: `${year}-${document.id}`,
      title: document.title,
      description: document.description,
      group: document.group,
      url: `${OFFICIAL_JLPT_ORIGIN}/samples/sample${year}/pdf/${document.filename}`,
    })),
  };
}

export const OFFICIAL_N5_COLLECTIONS: readonly OfficialCollection[] = [
  makeCollection(2018),
  makeCollection(2012),
];

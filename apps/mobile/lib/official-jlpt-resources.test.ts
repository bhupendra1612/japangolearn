import { describe, expect, it } from "vitest";
import {
  OFFICIAL_JLPT_POLICY_URL,
  OFFICIAL_JLPT_SOURCE_URL,
  OFFICIAL_N5_COLLECTIONS,
} from "./official-jlpt-resources";

describe("official JLPT N5 resource links", () => {
  it("offers the 2018 and 2012 practice workbooks with all seven PDFs", () => {
    expect(OFFICIAL_N5_COLLECTIONS.map((collection) => collection.year)).toEqual([2018, 2012]);
    for (const collection of OFFICIAL_N5_COLLECTIONS) {
      expect(collection.pdfs).toHaveLength(7);
      expect(collection.pdfs.filter((pdf) => pdf.group === "Test sections")).toHaveLength(4);
      expect(collection.pdfs.filter((pdf) => pdf.group === "Review materials")).toHaveLength(3);
    }
  });

  it("links directly to uniquely identified PDFs on the official JLPT domain", () => {
    const pdfs = OFFICIAL_N5_COLLECTIONS.flatMap((collection) => collection.pdfs);
    expect(new Set(pdfs.map((pdf) => pdf.id)).size).toBe(pdfs.length);
    for (const collection of OFFICIAL_N5_COLLECTIONS) {
      for (const pdf of collection.pdfs) {
        const url = new URL(pdf.url);
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toBe("www.jlpt.jp");
        expect(url.pathname).toMatch(
          new RegExp(`^/samples/sample${collection.year}/pdf/N5[^/]+\\.pdf$`)
        );
      }
    }
    expect(OFFICIAL_JLPT_SOURCE_URL).toBe("https://www.jlpt.jp/e/samples/sampleindex.html");
    expect(OFFICIAL_JLPT_POLICY_URL).toBe("https://www.jlpt.jp/e/policy.html");
  });
});

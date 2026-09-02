import { writeFile } from "node:fs/promises";
import { findSheetMusicFromYouTube } from "../server/sheetMusicFinder";

const url = "https://www.youtube.com/watch?v=fuKvTWUvvlY&list=RDfuKvTWUvvlY&start_radio=1";
const result = await findSheetMusicFromYouTube(url, "");

await writeFile(
  "/tmp/mood-blue-finder-result.json",
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  compositionName: result.compositionName,
  composer: result.composer,
  sourceCount: result.sources.length,
  directPdfSources: result.sources.filter((source) => source.canImportDirectly).map((source) => ({
    source: source.source,
    pdfUrl: source.pdfUrl,
  })),
}, null, 2));

import { hasEnglishDub, matchCrunchyrollSeries } from "./crunchyrollDubs";

describe("Crunchyroll English dub check", () => {
  it("reads en-US from the versions list, or the single audio locale when there is none", () => {
    expect(hasEnglishDub({ episode_metadata: { audio_locale: "ja-JP", versions: [{ audio_locale: "ja-JP" }, { audio_locale: "en-US" }] } })).toBe(true);
    expect(hasEnglishDub({ episode_metadata: { audio_locale: "ja-JP", versions: [{ audio_locale: "ja-JP" }, { audio_locale: "es-419" }] } })).toBe(false);
    expect(hasEnglishDub({ episode_metadata: { audio_locale: "en-US", versions: null } })).toBe(true);
    expect(hasEnglishDub({ episode_metadata: { audio_locale: "ja-JP", versions: [] } })).toBe(false);
    expect(hasEnglishDub(undefined)).toBeNull();
  });
  it("matches only one exact title within a year, never a near title", () => {
    const items = [{ id: "A", title: "DAN DA DAN", year: 2024 }, { id: "B", title: "Dance Dance Danseur", year: 2022 }];
    expect(matchCrunchyrollSeries("Dan Da Dan", 2024, items)).toBe("A");
    expect(matchCrunchyrollSeries("Dan Da Dan", null, items)).toBe("A");
    expect(matchCrunchyrollSeries("Dan Da Dan", 2019, items)).toBeNull();
    expect(matchCrunchyrollSeries("Baki", 2018, [{ id: "C", title: "BAKUMATSU", year: 2018 }])).toBeNull();
    expect(matchCrunchyrollSeries("Frieren", null, [{ id: "D", title: "Frieren", year: 2023 }, { id: "E", title: "FRIEREN", year: null }])).toBeNull();
  });
});

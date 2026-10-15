import { sameCrunchyrollEpisode, resumedCrunchyrollCompletion, recentCrunchyrollPlay, trustedCrunchyrollTitle, uniqueCrunchyrollEpisode } from "./crunchyrollAutoMatch";

describe("Crunchyroll automatic matching", () => {
  it("requires at least three reviewed episode anchors to one catalog show", () => {
    const anchors = [{kind:"episode",titleId:41},{kind:"episode",titleId:41},{kind:"episode",titleId:41}];
    expect(trustedCrunchyrollTitle(anchors)).toBe(41);
    expect(trustedCrunchyrollTitle(anchors.slice(0,2))).toBeNull();
    expect(trustedCrunchyrollTitle([...anchors,{kind:"episode",titleId:42}])).toBeNull();
    expect(trustedCrunchyrollTitle([...anchors,{kind:"movie",titleId:41}])).toBeNull();
  });
  const episodes = [
    { id: 202, episodeNumber: 23, title: "Balsam and Woodsorrel" },
    { id: 203, episodeNumber: 24, title: "Jinshi and Maomao" },
    { id: 204, episodeNumber: 25, title: "Maomao and Maomao" },
  ];
  it("requires a unique title and number, even when a dub uses another season label", () => {
    expect(uniqueCrunchyrollEpisode(episodes, 25, "Maomao and Maomao")).toBe(204);
    expect(uniqueCrunchyrollEpisode(episodes, 25, "Another title")).toBeNull();
    expect(uniqueCrunchyrollEpisode([...episodes, { ...episodes[2], id: 300 }], 25, "Maomao and Maomao")).toBeNull();
  });
  it("dates only new, recent observations after an established collector run", () => {
    const now = new Date("2026-09-27T09:00:00Z");
    const prior = new Date("2026-09-26T09:00:00Z");
    expect(recentCrunchyrollPlay("2026-09-27T02:00:00Z", prior, now, false)?.toISOString())
      .toBe("2026-09-27T02:00:00.000Z");
    expect(recentCrunchyrollPlay("2026-09-27T02:00:00Z", prior, now, true)).toBeNull();
    expect(recentCrunchyrollPlay("2026-09-27T02:00:00Z", null, now, false)).toBeNull();
    expect(recentCrunchyrollPlay("2026-08-10T02:00:00Z", prior, now, false)).toBeNull();
    expect(recentCrunchyrollPlay("2026-09-24T02:00:00Z", prior, now, false)).toBeNull();
    expect(recentCrunchyrollPlay("2026-09-27T10:00:00Z", prior, now, false)).toBeNull();
  });
});
describe("Crunchyroll resumed playback",()=>{
 const partial={date_played:"2026-09-29T03:29:28Z",fully_watched:false,parent_id:"series",panel:{id:"GWDU7MDZV",title:"A Ghost Story",episode_metadata:{series_id:"series",identifier:"series|S2|E10",episode_number:34}}};
 const finished={...partial,date_played:"2026-09-30T01:45:49Z",fully_watched:true};
 it("accepts next-night completion of the same stable episode",()=>{
  expect(sameCrunchyrollEpisode(partial,finished)).toBeTrue();
  expect(resumedCrunchyrollCompletion(partial,finished)).toBeTrue();
  expect(recentCrunchyrollPlay(finished.date_played,new Date("2026-09-29T09:00:00Z"),new Date("2026-09-30T09:00:00Z"),false)?.toISOString()).toBe("2026-09-30T01:45:49.000Z");
 });
 it("accepts a season label correction with unchanged panel, series, title and number",()=>{
  const renamed={...finished,panel:{...finished.panel,episode_metadata:{...finished.panel.episode_metadata,identifier:"series|S2|E34"}}};
  expect(sameCrunchyrollEpisode(partial,renamed)).toBeTrue();
  expect(sameCrunchyrollEpisode(partial,{...renamed,panel:{...renamed.panel,title:"Another episode"}})).toBeFalse();
  expect(sameCrunchyrollEpisode(partial,{...renamed,panel:{...renamed.panel,episode_metadata:{...renamed.panel.episode_metadata,episode_number:35}}})).toBeFalse();
 });
 it("holds real identity changes and incomplete legacy identity",()=>{
  expect(sameCrunchyrollEpisode(partial,{...finished,panel:{...finished.panel,id:"different"}})).toBeFalse();
  expect(sameCrunchyrollEpisode(partial,{...finished,parent_id:"other"})).toBeFalse();
  expect(sameCrunchyrollEpisode({},finished)).toBeFalse();
 });
 it("does not turn a repeat or backward observation into a fresh completion",()=>{
  expect(resumedCrunchyrollCompletion(finished,finished)).toBeFalse();
  expect(resumedCrunchyrollCompletion(partial,{...finished,date_played:"2026-09-28T00:00:00Z"})).toBeFalse();
  expect(resumedCrunchyrollCompletion(partial,partial)).toBeFalse();
 });
});

import { marqueeWriter } from "./marqueeWriter";
import { checkCrunchyrollDubs } from "./crunchyrollDubs";

// Runs after the 09:00 UTC Crunchyroll import. Marquee has one user (id 1, as in marqueeCrFinish).
export async function checkDubsDaily() {
  await marqueeWriter.work("provider:crunchyrollDubs", () => checkCrunchyrollDubs(1));
}

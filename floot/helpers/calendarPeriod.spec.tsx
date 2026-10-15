import {calendarMonths} from "./calendarPeriod";
import {nextScheduled,sourceState} from "./syncPresentation";
describe("Calendar periods and source health",()=>{
 it("fills zero months and never selects future months",()=>{expect(calendarMonths(["2026-07","2026-09","2027-01"],"3",new Date("2026-10-02T12:00:00Z"))).toEqual(["2026-08","2026-09","2026-10"]);});
 it("includes calendar boundaries in the account timezone",()=>{expect(calendarMonths([],"3",new Date("2026-10-01T01:00:00Z"))).toEqual(["2026-07","2026-08","2026-09"]);});
 it("spans gaps in all-time history",()=>{expect(calendarMonths(["2026-07","2026-09"],"all",new Date("2026-10-02T12:00:00Z"))).toEqual(["2026-07","2026-08","2026-09","2026-10"]);});
 it("gets the next source schedule through daylight saving changes",()=>{expect(nextScheduled([9],0,"America/New_York",new Date("2026-11-01T12:00:00Z"))?.toISOString()).toBe("2026-11-01T14:00:00.000Z");});
 it("distinguishes successful, overdue, paused, and blocked sources",()=>{const now=new Date("2026-10-02T12:00:00Z");expect(sourceState({mode:"live",last_success_at:"2026-10-01T10:00:00Z"},30,now)).toBe("Active");expect(sourceState({mode:"live",last_success_at:"2026-09-30T10:00:00Z"},30,now)).toBe("Overdue");expect(sourceState({mode:"disabled"},30,now)).toBe("Paused");expect(sourceState({mode:"live",credential_blocked:true},30,now)).toBe("Reconnect");});
});
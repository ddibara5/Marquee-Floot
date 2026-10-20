import { deviceName, screenName } from "./feedbackContext";

describe("feedbackContext", () => {
  it("names devices from the user agent", () => {
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iPhone");
    expect(deviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("iPad");
    expect(deviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("Mac");
    expect(deviceName("Mozilla/5.0 (Linux; Android 15; Pixel 9)")).toBe("Android");
    expect(deviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows");
    expect(deviceName("curl/8.0")).toBe("Other");
  });
  it("names screens from the route", () => {
    expect(screenName("/")).toBe("Home");
    expect(screenName("/settings")).toBe("Settings");
    expect(screenName("/settings/account")).toBe("Settings, Account");
  });
});

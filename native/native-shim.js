// Bundled screens load from capacitor://localhost, but Marquee calls its
// backend with relative "/_api/..." paths. Send those to the live Floot app.
// CapacitorHttp (capacitor.config.json) carries the request natively, so the
// session cookie is kept and no browser CORS check applies.
(function () {
  var ORIGIN = "https://marquee-ddibara.floot.app";
  var nativeFetch = window.fetch.bind(window);
  // Compare scheme + host: URL.origin is "null" for custom schemes like capacitor://.
  var isLocalApi = function (u) {
    return u.protocol === location.protocol && u.host === location.host && u.pathname.indexOf("/_api/") === 0;
  };
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.indexOf("/_api/") === 0) {
      input = ORIGIN + input;
    } else if (input instanceof URL && isLocalApi(input)) {
      input = ORIGIN + input.pathname + input.search;
    } else if (input instanceof Request) {
      var u = new URL(input.url);
      if (isLocalApi(u)) {
        input = new Request(ORIGIN + u.pathname + u.search, input);
      }
    }
    return nativeFetch(input, init);
  };
})();

(function () {
  "use strict";
  var script = document.currentScript;
  var WORKBOOK = (script && script.getAttribute("data-workbook")) || "fetch.xlsx";
  var wbPromise = null;

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function fetchOnce() {
    return fetch(WORKBOOK, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load " + WORKBOOK + " (" + res.status + ")");
        return res.arrayBuffer();
      })
      .then(function (buf) {
        if (typeof XLSX === "undefined") throw new Error("SheetJS (XLSX) not loaded");
        return XLSX.read(new Uint8Array(buf), { type: "array" });
      });
  }

  /* Local antivirus/web-protection tools (Kaspersky et al.) sometimes inject
     scripts into localhost pages and intermittently break the first fetch()
     call on a page (observed: "Failed to fetch" thrown from their injected
     script, not from this code). That's a transient failure, not a real
     404/network-down — so retry a few times with backoff before giving up. */
  function fetchWithRetry(attemptsLeft, waitMs) {
    return fetchOnce().catch(function (err) {
      if (attemptsLeft <= 1) throw err;
      return delay(waitMs).then(function () {
        return fetchWithRetry(attemptsLeft - 1, Math.round(waitMs * 1.7));
      });
    });
  }

  function fetchWorkbook() {
    if (wbPromise) return wbPromise;
    wbPromise = fetchWithRetry(4, 350).catch(function (err) {
      /* Don't permanently cache a failure — let a later call try again
         fresh instead of being stuck rejected for the rest of the page's
         life. */
      wbPromise = null;
      throw err;
    });
    return wbPromise;
  }

  function coerce(row) {
    var out = {};
    Object.keys(row).forEach(function (k) {
      var v = row[k];
      out[k] = typeof v === "string" ? v : v == null ? "" : String(v);
    });
    return out;
  }

  function load(sheetName) {
    return fetchWorkbook().then(function (wb) {
      var ws = wb.Sheets[sheetName];
      if (!ws) throw new Error("Sheet not found in workbook: " + sheetName);
      return XLSX.utils
        .sheet_to_json(ws, { defval: "" })
        .map(coerce)
        .filter(function (o) {
          return Object.keys(o).some(function (k) { return o[k] !== ""; });
        });
    });
  }

  window.PortfolioData = { load: load, workbook: WORKBOOK };
})();

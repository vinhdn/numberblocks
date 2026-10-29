/* Polyfills for legacy TV browsers (Samsung Tizen 4.0 ≈ Chrome 56).
   Only fills gaps that are actually missing; modern browsers skip everything.
   Written in plain ES5 style so it parses on any engine.
   Load order: this file must run before app.js. */
(function () {
  // String.prototype.padStart / padEnd (ES2017, Chrome 57) —
  // app.js formats the parent-timer countdown with padStart; without it
  // updateTimerUI throws and blocks the player from opening on the TV.
  function makePad(isStart) {
    return function (maxLength, fillString) {
      var str = String(this);
      maxLength = Math.floor(Number(maxLength)) || 0;
      if (str.length >= maxLength) return str;
      fillString = fillString === undefined ? " " : String(fillString);
      if (fillString === "") return str;
      var fillLen = maxLength - str.length;
      var filler = fillString.repeat(Math.ceil(fillLen / fillString.length)).slice(0, fillLen);
      return isStart ? filler + str : str + filler;
    };
  }
  // String.prototype.repeat is ES2015 (Chrome 41), present wherever this runs;
  // guard anyway so the polyfill itself can never throw.
  if (typeof "".repeat !== "function") return;
  if (typeof "".padStart !== "function") {
    Object.defineProperty(String.prototype, "padStart", {
      value: makePad(true), writable: true, configurable: true
    });
  }
  if (typeof "".padEnd !== "function") {
    Object.defineProperty(String.prototype, "padEnd", {
      value: makePad(false), writable: true, configurable: true
    });
  }
})();

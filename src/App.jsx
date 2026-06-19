import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ── Office World Cup Prediction League ─────────────────────────────
   Shared-storage office pool: predictions, auto-scoring, bonus picks,
   leaderboard with prizes. Commissioner mode manages matches/results.
──────────────────────────────────────────────────────────────────── */

const BONUS_DEFS = [
  { key: "champion", label: "Champion", pts: 15, icon: "🏆" },
  { key: "runnerUp", label: "Runner-up", pts: 10, icon: "🥈" },
  { key: "topScorer", label: "Top scorer", pts: 10, icon: "⚽" },
  { key: "bestGk", label: "Best defense / GK", pts: 5, icon: "🧤" },
  { key: "upset", label: "Biggest upset", pts: 5, icon: "🚩" },
];

/* Official 2026 group stage — all 72 matches, ET kickoff times */
const SEED_ROWS = [
["A","Mexico","South Africa","Thu Jun 11 · 3pm ET"],
["A","South Korea","Czechia","Thu Jun 11 · 10pm ET"],
["B","Canada","Bosnia & Herzegovina","Fri Jun 12 · 3pm ET"],
["D","USA","Paraguay","Fri Jun 12 · 9pm ET"],
["B","Qatar","Switzerland","Sat Jun 13 · 3pm ET"],
["C","Brazil","Morocco","Sat Jun 13 · 6pm ET"],
["C","Haiti","Scotland","Sat Jun 13 · 9pm ET"],
["D","Australia","Türkiye","Sat Jun 13 · 12am ET (Jun 14)"],
["E","Germany","Curaçao","Sun Jun 14 · 1pm ET"],
["F","Netherlands","Japan","Sun Jun 14 · 4pm ET"],
["E","Ivory Coast","Ecuador","Sun Jun 14 · 7pm ET"],
["F","Sweden","Tunisia","Sun Jun 14 · 10pm ET"],
["H","Spain","Cape Verde","Mon Jun 15 · 12pm ET"],
["G","Belgium","Egypt","Mon Jun 15 · 3pm ET"],
["H","Saudi Arabia","Uruguay","Mon Jun 15 · 6pm ET"],
["G","Iran","New Zealand","Mon Jun 15 · 9pm ET"],
["I","France","Senegal","Tue Jun 16 · 3pm ET"],
["I","Iraq","Norway","Tue Jun 16 · 6pm ET"],
["J","Argentina","Algeria","Tue Jun 16 · 9pm ET"],
["J","Austria","Jordan","Tue Jun 16 · 12am ET (Jun 17)"],
["K","Portugal","DR Congo","Wed Jun 17 · 1pm ET"],
["L","England","Croatia","Wed Jun 17 · 4pm ET"],
["L","Ghana","Panama","Wed Jun 17 · 7pm ET"],
["K","Uzbekistan","Colombia","Wed Jun 17 · 10pm ET"],
["A","Czechia","South Africa","Thu Jun 18 · 12pm ET"],
["B","Switzerland","Bosnia & Herzegovina","Thu Jun 18 · 3pm ET"],
["B","Canada","Qatar","Thu Jun 18 · 6pm ET"],
["A","Mexico","South Korea","Thu Jun 18 · 9pm ET"],
["D","USA","Australia","Fri Jun 19 · 3pm ET"],
["C","Scotland","Morocco","Fri Jun 19 · 6pm ET"],
["C","Brazil","Haiti","Fri Jun 19 · 8:30pm ET"],
["D","Türkiye","Paraguay","Fri Jun 19 · 12am ET (Jun 20)"],
["F","Netherlands","Sweden","Sat Jun 20 · 1pm ET"],
["E","Germany","Ivory Coast","Sat Jun 20 · 4pm ET"],
["E","Ecuador","Curaçao","Sat Jun 20 · 8pm ET"],
["F","Tunisia","Japan","Sat Jun 20 · 12am ET (Jun 21)"],
["H","Spain","Saudi Arabia","Sun Jun 21 · 12pm ET"],
["G","Belgium","Iran","Sun Jun 21 · 3pm ET"],
["H","Uruguay","Cape Verde","Sun Jun 21 · 6pm ET"],
["G","New Zealand","Egypt","Sun Jun 21 · 9pm ET"],
["J","Argentina","Austria","Mon Jun 22 · 1pm ET"],
["I","France","Iraq","Mon Jun 22 · 5pm ET"],
["I","Norway","Senegal","Mon Jun 22 · 8pm ET"],
["J","Jordan","Algeria","Mon Jun 22 · 11pm ET"],
["K","Portugal","Uzbekistan","Tue Jun 23 · 1pm ET"],
["L","England","Ghana","Tue Jun 23 · 4pm ET"],
["L","Panama","Croatia","Tue Jun 23 · 7pm ET"],
["K","Colombia","DR Congo","Tue Jun 23 · 10pm ET"],
["B","Switzerland","Canada","Wed Jun 24 · 3pm ET"],
["B","Bosnia & Herzegovina","Qatar","Wed Jun 24 · 3pm ET"],
["C","Scotland","Brazil","Wed Jun 24 · 6pm ET"],
["C","Morocco","Haiti","Wed Jun 24 · 6pm ET"],
["A","Czechia","Mexico","Wed Jun 24 · 9pm ET"],
["A","South Africa","South Korea","Wed Jun 24 · 9pm ET"],
["E","Ecuador","Germany","Thu Jun 25 · 4pm ET"],
["E","Curaçao","Ivory Coast","Thu Jun 25 · 4pm ET"],
["F","Japan","Sweden","Thu Jun 25 · 7pm ET"],
["F","Tunisia","Netherlands","Thu Jun 25 · 7pm ET"],
["D","Türkiye","USA","Thu Jun 25 · 10pm ET"],
["D","Paraguay","Australia","Thu Jun 25 · 10pm ET"],
["I","Norway","France","Fri Jun 26 · 3pm ET"],
["I","Senegal","Iraq","Fri Jun 26 · 3pm ET"],
["H","Cape Verde","Saudi Arabia","Fri Jun 26 · 8pm ET"],
["H","Uruguay","Spain","Fri Jun 26 · 8pm ET"],
["G","Egypt","Iran","Fri Jun 26 · 11pm ET"],
["G","New Zealand","Belgium","Fri Jun 26 · 11pm ET"],
["L","Panama","England","Sat Jun 27 · 5pm ET"],
["L","Croatia","Ghana","Sat Jun 27 · 5pm ET"],
["K","Colombia","Portugal","Sat Jun 27 · 7:30pm ET"],
["K","DR Congo","Uzbekistan","Sat Jun 27 · 7:30pm ET"],
["J","Algeria","Austria","Sat Jun 27 · 10pm ET"],
["J","Jordan","Argentina","Sat Jun 27 · 10pm ET"],
];
/* UTC kickoff per seed row — picks auto-close at these times */
const KICKOFFS = [
"2026-06-11T19:00Z","2026-06-12T02:00Z","2026-06-12T19:00Z","2026-06-13T01:00Z",
"2026-06-13T19:00Z","2026-06-13T22:00Z","2026-06-14T01:00Z","2026-06-14T04:00Z",
"2026-06-14T17:00Z","2026-06-14T20:00Z","2026-06-14T23:00Z","2026-06-15T02:00Z",
"2026-06-15T16:00Z","2026-06-15T19:00Z","2026-06-15T22:00Z","2026-06-16T01:00Z",
"2026-06-16T19:00Z","2026-06-16T22:00Z","2026-06-17T01:00Z","2026-06-17T04:00Z",
"2026-06-17T17:00Z","2026-06-17T20:00Z","2026-06-17T23:00Z","2026-06-18T02:00Z",
"2026-06-18T16:00Z","2026-06-18T19:00Z","2026-06-18T22:00Z","2026-06-19T01:00Z",
"2026-06-19T19:00Z","2026-06-19T22:00Z","2026-06-20T00:30Z","2026-06-20T04:00Z",
"2026-06-20T17:00Z","2026-06-20T20:00Z","2026-06-21T00:00Z","2026-06-21T04:00Z",
"2026-06-21T16:00Z","2026-06-21T19:00Z","2026-06-21T22:00Z","2026-06-22T01:00Z",
"2026-06-22T17:00Z","2026-06-22T21:00Z","2026-06-23T00:00Z","2026-06-23T03:00Z",
"2026-06-23T17:00Z","2026-06-23T20:00Z","2026-06-23T23:00Z","2026-06-24T02:00Z",
"2026-06-24T19:00Z","2026-06-24T19:00Z","2026-06-24T22:00Z","2026-06-24T22:00Z",
"2026-06-25T01:00Z","2026-06-25T01:00Z","2026-06-25T20:00Z","2026-06-25T20:00Z",
"2026-06-25T23:00Z","2026-06-25T23:00Z","2026-06-26T02:00Z","2026-06-26T02:00Z",
"2026-06-26T19:00Z","2026-06-26T19:00Z","2026-06-27T00:00Z","2026-06-27T00:00Z",
"2026-06-27T03:00Z","2026-06-27T03:00Z","2026-06-27T21:00Z","2026-06-27T21:00Z",
"2026-06-27T23:30Z","2026-06-27T23:30Z","2026-06-28T02:00Z","2026-06-28T02:00Z",
];
const SEED_MATCHES = SEED_ROWS.map((r, i) => ({
  id: `gs${String(i + 1).padStart(2, "0")}`, ord: i, g: r[0],
  home: r[1], away: r[2], date: r[3], ko: KICKOFFS[i], locked: false, sh: null, sa: null,
}));

const RECOVERED_BACKUP = {"app": "office-world-cup-prediction-league", "backupVersion": 1, "exportedAt": "2026-06-19T11:34:20.502400Z", "source": "recovered-from-memory", "matches": [{"id": "gs01", "ord": 0, "g": "A", "home": "Mexico", "away": "South Africa", "date": "Thu Jun 11 · 3pm ET", "ko": "2026-06-11T19:00Z", "locked": true, "sh": 2, "sa": 0}, {"id": "gs02", "ord": 1, "g": "A", "home": "South Korea", "away": "Czechia", "date": "Thu Jun 11 · 10pm ET", "ko": "2026-06-12T02:00Z", "locked": true, "sh": 2, "sa": 1}, {"id": "gs03", "ord": 2, "g": "B", "home": "Canada", "away": "Bosnia & Herzegovina", "date": "Fri Jun 12 · 3pm ET", "ko": "2026-06-12T19:00Z", "locked": true, "sh": 1, "sa": 1}, {"id": "gs04", "ord": 3, "g": "D", "home": "USA", "away": "Paraguay", "date": "Fri Jun 12 · 9pm ET", "ko": "2026-06-13T01:00Z", "locked": true, "sh": 4, "sa": 1}, {"id": "gs05", "ord": 4, "g": "B", "home": "Qatar", "away": "Switzerland", "date": "Sat Jun 13 · 3pm ET", "ko": "2026-06-13T19:00Z", "locked": true, "sh": 1, "sa": 1}, {"id": "gs06", "ord": 5, "g": "C", "home": "Brazil", "away": "Morocco", "date": "Sat Jun 13 · 6pm ET", "ko": "2026-06-13T22:00Z", "locked": true, "sh": 1, "sa": 1}, {"id": "gs07", "ord": 6, "g": "C", "home": "Haiti", "away": "Scotland", "date": "Sat Jun 13 · 9pm ET", "ko": "2026-06-14T01:00Z", "locked": true, "sh": 0, "sa": 1}, {"id": "gs08", "ord": 7, "g": "D", "home": "Australia", "away": "Türkiye", "date": "Sat Jun 13 · 12am ET (Jun 14)", "ko": "2026-06-14T04:00Z", "locked": true, "sh": 2, "sa": 0}, {"id": "gs09", "ord": 8, "g": "E", "home": "Germany", "away": "Curaçao", "date": "Sun Jun 14 · 1pm ET", "ko": "2026-06-14T17:00Z", "locked": true, "sh": 7, "sa": 1}, {"id": "gs10", "ord": 9, "g": "F", "home": "Netherlands", "away": "Japan", "date": "Sun Jun 14 · 4pm ET", "ko": "2026-06-14T20:00Z", "locked": true, "sh": 2, "sa": 2}, {"id": "gs11", "ord": 10, "g": "E", "home": "Ivory Coast", "away": "Ecuador", "date": "Sun Jun 14 · 7pm ET", "ko": "2026-06-14T23:00Z", "locked": true, "sh": 1, "sa": 0}, {"id": "gs12", "ord": 11, "g": "F", "home": "Sweden", "away": "Tunisia", "date": "Sun Jun 14 · 10pm ET", "ko": "2026-06-15T02:00Z", "locked": true, "sh": 5, "sa": 1}, {"id": "gs13", "ord": 12, "g": "H", "home": "Spain", "away": "Cape Verde", "date": "Mon Jun 15 · 12pm ET", "ko": "2026-06-15T16:00Z", "locked": true, "sh": 0, "sa": 0}, {"id": "gs14", "ord": 13, "g": "G", "home": "Belgium", "away": "Egypt", "date": "Mon Jun 15 · 3pm ET", "ko": "2026-06-15T19:00Z", "locked": true, "sh": 1, "sa": 1}, {"id": "gs15", "ord": 14, "g": "H", "home": "Saudi Arabia", "away": "Uruguay", "date": "Mon Jun 15 · 6pm ET", "ko": "2026-06-15T22:00Z", "locked": true, "sh": 1, "sa": 1}, {"id": "gs16", "ord": 15, "g": "G", "home": "Iran", "away": "New Zealand", "date": "Mon Jun 15 · 9pm ET", "ko": "2026-06-16T01:00Z", "locked": true, "sh": 2, "sa": 2}, {"id": "gs17", "ord": 16, "g": "I", "home": "France", "away": "Senegal", "date": "Tue Jun 16 · 3pm ET", "ko": "2026-06-16T19:00Z", "locked": true, "sh": 3, "sa": 1}, {"id": "gs18", "ord": 17, "g": "I", "home": "Iraq", "away": "Norway", "date": "Tue Jun 16 · 6pm ET", "ko": "2026-06-16T22:00Z", "locked": true, "sh": 1, "sa": 4}, {"id": "gs19", "ord": 18, "g": "J", "home": "Argentina", "away": "Algeria", "date": "Tue Jun 16 · 9pm ET", "ko": "2026-06-17T01:00Z", "locked": true, "sh": 3, "sa": 0}, {"id": "gs20", "ord": 19, "g": "J", "home": "Austria", "away": "Jordan", "date": "Tue Jun 16 · 12am ET (Jun 17)", "ko": "2026-06-17T04:00Z", "locked": true, "sh": 3, "sa": 1}, {"id": "gs21", "ord": 20, "g": "K", "home": "Portugal", "away": "DR Congo", "date": "Wed Jun 17 · 1pm ET", "ko": "2026-06-17T17:00Z", "locked": true, "sh": 1, "sa": 1}, {"id": "gs22", "ord": 21, "g": "L", "home": "England", "away": "Croatia", "date": "Wed Jun 17 · 4pm ET", "ko": "2026-06-17T20:00Z", "locked": true, "sh": 4, "sa": 2}, {"id": "gs23", "ord": 22, "g": "L", "home": "Ghana", "away": "Panama", "date": "Wed Jun 17 · 7pm ET", "ko": "2026-06-17T23:00Z", "locked": true, "sh": 1, "sa": 0}, {"id": "gs24", "ord": 23, "g": "K", "home": "Uzbekistan", "away": "Colombia", "date": "Wed Jun 17 · 10pm ET", "ko": "2026-06-18T02:00Z", "locked": true, "sh": 1, "sa": 3}, {"id": "gs25", "ord": 24, "g": "A", "home": "Czechia", "away": "South Africa", "date": "Thu Jun 18 · 12pm ET", "ko": "2026-06-18T16:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs26", "ord": 25, "g": "B", "home": "Switzerland", "away": "Bosnia & Herzegovina", "date": "Thu Jun 18 · 3pm ET", "ko": "2026-06-18T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs27", "ord": 26, "g": "B", "home": "Canada", "away": "Qatar", "date": "Thu Jun 18 · 6pm ET", "ko": "2026-06-18T22:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs28", "ord": 27, "g": "A", "home": "Mexico", "away": "South Korea", "date": "Thu Jun 18 · 9pm ET", "ko": "2026-06-19T01:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs29", "ord": 28, "g": "D", "home": "USA", "away": "Australia", "date": "Fri Jun 19 · 3pm ET", "ko": "2026-06-19T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs30", "ord": 29, "g": "C", "home": "Scotland", "away": "Morocco", "date": "Fri Jun 19 · 6pm ET", "ko": "2026-06-19T22:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs31", "ord": 30, "g": "C", "home": "Brazil", "away": "Haiti", "date": "Fri Jun 19 · 8:30pm ET", "ko": "2026-06-20T00:30Z", "locked": false, "sh": null, "sa": null}, {"id": "gs32", "ord": 31, "g": "D", "home": "Türkiye", "away": "Paraguay", "date": "Fri Jun 19 · 12am ET (Jun 20)", "ko": "2026-06-20T04:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs33", "ord": 32, "g": "F", "home": "Netherlands", "away": "Sweden", "date": "Sat Jun 20 · 1pm ET", "ko": "2026-06-20T17:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs34", "ord": 33, "g": "E", "home": "Germany", "away": "Ivory Coast", "date": "Sat Jun 20 · 4pm ET", "ko": "2026-06-20T20:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs35", "ord": 34, "g": "E", "home": "Ecuador", "away": "Curaçao", "date": "Sat Jun 20 · 8pm ET", "ko": "2026-06-21T00:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs36", "ord": 35, "g": "F", "home": "Tunisia", "away": "Japan", "date": "Sat Jun 20 · 12am ET (Jun 21)", "ko": "2026-06-21T04:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs37", "ord": 36, "g": "H", "home": "Spain", "away": "Saudi Arabia", "date": "Sun Jun 21 · 12pm ET", "ko": "2026-06-21T16:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs38", "ord": 37, "g": "G", "home": "Belgium", "away": "Iran", "date": "Sun Jun 21 · 3pm ET", "ko": "2026-06-21T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs39", "ord": 38, "g": "H", "home": "Uruguay", "away": "Cape Verde", "date": "Sun Jun 21 · 6pm ET", "ko": "2026-06-21T22:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs40", "ord": 39, "g": "G", "home": "New Zealand", "away": "Egypt", "date": "Sun Jun 21 · 9pm ET", "ko": "2026-06-22T01:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs41", "ord": 40, "g": "J", "home": "Argentina", "away": "Austria", "date": "Mon Jun 22 · 1pm ET", "ko": "2026-06-22T17:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs42", "ord": 41, "g": "I", "home": "France", "away": "Iraq", "date": "Mon Jun 22 · 5pm ET", "ko": "2026-06-22T21:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs43", "ord": 42, "g": "I", "home": "Norway", "away": "Senegal", "date": "Mon Jun 22 · 8pm ET", "ko": "2026-06-23T00:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs44", "ord": 43, "g": "J", "home": "Jordan", "away": "Algeria", "date": "Mon Jun 22 · 11pm ET", "ko": "2026-06-23T03:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs45", "ord": 44, "g": "K", "home": "Portugal", "away": "Uzbekistan", "date": "Tue Jun 23 · 1pm ET", "ko": "2026-06-23T17:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs46", "ord": 45, "g": "L", "home": "England", "away": "Ghana", "date": "Tue Jun 23 · 4pm ET", "ko": "2026-06-23T20:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs47", "ord": 46, "g": "L", "home": "Panama", "away": "Croatia", "date": "Tue Jun 23 · 7pm ET", "ko": "2026-06-23T23:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs48", "ord": 47, "g": "K", "home": "Colombia", "away": "DR Congo", "date": "Tue Jun 23 · 10pm ET", "ko": "2026-06-24T02:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs49", "ord": 48, "g": "B", "home": "Switzerland", "away": "Canada", "date": "Wed Jun 24 · 3pm ET", "ko": "2026-06-24T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs50", "ord": 49, "g": "B", "home": "Bosnia & Herzegovina", "away": "Qatar", "date": "Wed Jun 24 · 3pm ET", "ko": "2026-06-24T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs51", "ord": 50, "g": "C", "home": "Scotland", "away": "Brazil", "date": "Wed Jun 24 · 6pm ET", "ko": "2026-06-24T22:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs52", "ord": 51, "g": "C", "home": "Morocco", "away": "Haiti", "date": "Wed Jun 24 · 6pm ET", "ko": "2026-06-24T22:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs53", "ord": 52, "g": "A", "home": "Czechia", "away": "Mexico", "date": "Wed Jun 24 · 9pm ET", "ko": "2026-06-25T01:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs54", "ord": 53, "g": "A", "home": "South Africa", "away": "South Korea", "date": "Wed Jun 24 · 9pm ET", "ko": "2026-06-25T01:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs55", "ord": 54, "g": "E", "home": "Ecuador", "away": "Germany", "date": "Thu Jun 25 · 4pm ET", "ko": "2026-06-25T20:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs56", "ord": 55, "g": "E", "home": "Curaçao", "away": "Ivory Coast", "date": "Thu Jun 25 · 4pm ET", "ko": "2026-06-25T20:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs57", "ord": 56, "g": "F", "home": "Japan", "away": "Sweden", "date": "Thu Jun 25 · 7pm ET", "ko": "2026-06-25T23:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs58", "ord": 57, "g": "F", "home": "Tunisia", "away": "Netherlands", "date": "Thu Jun 25 · 7pm ET", "ko": "2026-06-25T23:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs59", "ord": 58, "g": "D", "home": "Türkiye", "away": "USA", "date": "Thu Jun 25 · 10pm ET", "ko": "2026-06-26T02:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs60", "ord": 59, "g": "D", "home": "Paraguay", "away": "Australia", "date": "Thu Jun 25 · 10pm ET", "ko": "2026-06-26T02:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs61", "ord": 60, "g": "I", "home": "Norway", "away": "France", "date": "Fri Jun 26 · 3pm ET", "ko": "2026-06-26T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs62", "ord": 61, "g": "I", "home": "Senegal", "away": "Iraq", "date": "Fri Jun 26 · 3pm ET", "ko": "2026-06-26T19:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs63", "ord": 62, "g": "H", "home": "Cape Verde", "away": "Saudi Arabia", "date": "Fri Jun 26 · 8pm ET", "ko": "2026-06-27T00:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs64", "ord": 63, "g": "H", "home": "Uruguay", "away": "Spain", "date": "Fri Jun 26 · 8pm ET", "ko": "2026-06-27T00:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs65", "ord": 64, "g": "G", "home": "Egypt", "away": "Iran", "date": "Fri Jun 26 · 11pm ET", "ko": "2026-06-27T03:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs66", "ord": 65, "g": "G", "home": "New Zealand", "away": "Belgium", "date": "Fri Jun 26 · 11pm ET", "ko": "2026-06-27T03:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs67", "ord": 66, "g": "L", "home": "Panama", "away": "England", "date": "Sat Jun 27 · 5pm ET", "ko": "2026-06-27T21:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs68", "ord": 67, "g": "L", "home": "Croatia", "away": "Ghana", "date": "Sat Jun 27 · 5pm ET", "ko": "2026-06-27T21:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs69", "ord": 68, "g": "K", "home": "Colombia", "away": "Portugal", "date": "Sat Jun 27 · 7:30pm ET", "ko": "2026-06-27T23:30Z", "locked": false, "sh": null, "sa": null}, {"id": "gs70", "ord": 69, "g": "K", "home": "DR Congo", "away": "Uzbekistan", "date": "Sat Jun 27 · 7:30pm ET", "ko": "2026-06-27T23:30Z", "locked": false, "sh": null, "sa": null}, {"id": "gs71", "ord": 70, "g": "J", "home": "Algeria", "away": "Austria", "date": "Sat Jun 27 · 10pm ET", "ko": "2026-06-28T02:00Z", "locked": false, "sh": null, "sa": null}, {"id": "gs72", "ord": 71, "g": "J", "home": "Jordan", "away": "Argentina", "date": "Sat Jun 27 · 10pm ET", "ko": "2026-06-28T02:00Z", "locked": false, "sh": null, "sa": null}], "players": ["frank_pavon", "gabe", "hill", "sean", "jovita", "iggylicious", "gerardo_m_", "leo", "mike"], "predictions": {"frank_pavon": {"gs02": {"h": 3, "a": 0}, "gs01": {"h": 1, "a": 2}, "gs03": {"h": 3, "a": 0}, "gs06": {"h": 2, "a": 2}, "gs05": {"h": 0, "a": 2}, "gs04": {"h": 3, "a": 1}, "gs08": {"h": 1, "a": 1}, "gs09": {"h": 3, "a": 0}, "gs10": {"h": 2, "a": 0}, "gs11": {"h": 0, "a": 1}, "gs13": {"h": 4, "a": 1}, "gs12": {"h": 1, "a": 0}, "gs14": {"h": 0, "a": 1}, "gs15": {"h": 3, "a": 2}, "gs16": {"h": 0, "a": 1}, "gs17": {"h": 4, "a": 0}, "gs18": {"h": 0, "a": 0}, "gs19": {"h": 4, "a": 1}, "gs20": {"h": 1, "a": 3}}, "gabe": {"gs02": {"h": 2, "a": 1}, "gs01": {"h": 3, "a": 0}, "gs03": {"h": 2, "a": 0}, "gs04": {"h": 2, "a": 2}, "gs07": {"h": 1, "a": 1}, "gs08": {"h": 1, "a": 1}, "gs09": {"h": 3, "a": 0}, "gs10": {"h": 3, "a": 2}, "gs11": {"h": 0, "a": 2}, "gs12": {"h": 1, "a": 1}, "gs13": {"h": 5, "a": 1}, "gs14": {"h": 3, "a": 1}, "gs16": {"h": 3, "a": 1}, "gs15": {"h": 2, "a": 2}, "gs17": {"h": 2, "a": 1}, "gs19": {"h": 4, "a": 0}, "gs20": {"h": 2, "a": 0}, "gs18": {"h": 1, "a": 2}, "gs21": {"h": 4, "a": 0}, "gs22": {"h": 2, "a": 2}, "gs23": {"h": 1, "a": 2}, "gs24": {"h": 1, "a": 2}, "gs25": {"h": 3, "a": 1}, "gs26": {"h": 2, "a": 0}, "gs27": {"h": 1, "a": 1}, "gs28": {"h": 1, "a": 3}, "gs29": {"h": 3, "a": 2}}, "hill": {"gs03": {"h": 1, "a": 2}, "gs01": {"h": 2, "a": 0}, "gs04": {"h": 2, "a": 1}, "gs05": {"h": 0, "a": 2}, "gs06": {"h": 3, "a": 1}, "gs07": {"h": 0, "a": 1}, "gs15": {"h": 1, "a": 2}, "gs16": {"h": 3, "a": 0}, "gs17": {"h": 3, "a": 1}, "gs18": {"h": 2, "a": 2}, "gs19": {"h": 4, "a": 1}, "gs20": {"h": 2, "a": 0}, "gs21": {"h": 3, "a": 0}, "gs22": {"h": 2, "a": 1}, "gs23": {"h": 1, "a": 1}, "gs24": {"h": 0, "a": 2}, "gs25": {"h": 2, "a": 0}, "gs26": {"h": 2, "a": 3}, "gs27": {"h": 1, "a": 0}, "gs28": {"h": 3, "a": 2}, "gs29": {"h": 3, "a": 2}, "gs30": {"h": 2, "a": 2}, "gs31": {"h": 2, "a": 0}, "gs32": {"h": 0, "a": 1}, "gs33": {"h": 2, "a": 1}, "gs34": {"h": 3, "a": 1}, "gs35": {"h": 2, "a": 0}}, "sean": {"gs03": {"h": 2, "a": 1}, "gs04": {"h": 2, "a": 1}, "gs05": {"h": 1, "a": 3}, "gs06": {"h": 2, "a": 1}, "gs07": {"h": 0, "a": 1}, "gs08": {"h": 1, "a": 2}, "gs09": {"h": 4, "a": 0}, "gs10": {"h": 2, "a": 1}, "gs01": {"h": 2, "a": 0}, "gs13": {"h": 4, "a": 0}, "gs14": {"h": 2, "a": 0}, "gs15": {"h": 0, "a": 2}, "gs16": {"h": 3, "a": 1}, "gs17": {"h": 3, "a": 0}, "gs18": {"h": 1, "a": 3}, "gs19": {"h": 2, "a": 0}, "gs20": {"h": 2, "a": 0}, "gs21": {"h": 3, "a": 0}, "gs22": {"h": 2, "a": 1}, "gs23": {"h": 2, "a": 1}, "gs24": {"h": 2, "a": 0}, "gs26": {"h": 2, "a": 0}, "gs27": {"h": 2, "a": 1}, "gs28": {"h": 2, "a": 2}, "gs29": {"h": 2, "a": 0}, "gs30": {"h": 1, "a": 0}, "gs31": {"h": 2, "a": 0}, "gs25": {"h": 2, "a": 1}, "gs32": {"h": 2, "a": 1}, "gs33": {"h": 3, "a": 2}, "gs34": {"h": 3, "a": 1}, "gs35": {"h": 3, "a": 1}, "gs36": {"h": 0, "a": 3}, "gs37": {"h": 4, "a": 0}, "gs38": {"h": 2, "a": 1}, "gs39": {"h": 1, "a": 0}, "gs40": {"h": 1, "a": 2}, "gs41": {"h": 3, "a": 1}, "gs42": {"h": 3, "a": 0}, "gs43": {"h": 2, "a": 1}, "gs44": {"h": 1, "a": 1}, "gs45": {"h": 4, "a": 0}, "gs46": {"h": 2, "a": 0}, "gs48": {"h": 2, "a": 1}}, "jovita": {"gs02": {"h": 2, "a": 1}, "gs03": {"h": 1, "a": 1}, "gs04": {"h": 2, "a": 1}, "gs05": {"h": 0, "a": 2}, "gs06": {"h": 2, "a": 2}, "gs07": {"h": 0, "a": 2}, "gs08": {"h": 1, "a": 4}, "gs09": {"h": 4, "a": 0}, "gs10": {"h": 1, "a": 1}, "gs11": {"h": 0, "a": 0}, "gs12": {"h": 3, "a": 0}, "gs13": {"h": 4, "a": 0}, "gs14": {"h": 3, "a": 1}, "gs15": {"h": 1, "a": 2}, "gs16": {"h": 2, "a": 0}, "gs17": {"h": 3, "a": 1}, "gs18": {"h": 0, "a": 4}, "gs19": {"h": 1, "a": 2}, "gs20": {"h": 2, "a": 0}, "gs21": {"h": 3, "a": 0}, "gs22": {"h": 0, "a": 0}, "gs23": {"h": 3, "a": 2}, "gs24": {"h": 0, "a": 1}, "gs01": {"h": 1, "a": 0}, "gs49": {"h": 2, "a": 0}, "gs26": {"h": 2, "a": 1}, "gs25": {"h": 1, "a": 1}, "gs27": {"h": 1, "a": 0}, "gs28": {"h": 2, "a": 1}, "gs29": {"h": 2, "a": 0}, "gs60": {"h": 1, "a": 0}, "gs50": {"h": 0, "a": 0}, "gs51": {"h": 0, "a": 2}, "gs52": {"h": 4, "a": 0}, "gs53": {"h": 1, "a": 2}, "gs54": {"h": 0, "a": 1}, "gs55": {"h": 1, "a": 1}, "gs56": {"h": 0, "a": 2}, "gs57": {"h": 1, "a": 0}, "gs58": {"h": 0, "a": 2}, "gs32": {"h": 2, "a": 0}, "gs30": {"h": 1, "a": 2}, "gs31": {"h": 3, "a": 0}, "gs59": {"h": 2, "a": 2}, "gs34": {"h": 2, "a": 1}, "gs35": {"h": 3, "a": 0}, "gs33": {"h": 1, "a": 1}, "gs36": {"h": 0, "a": 2}, "gs38": {"h": 2, "a": 1}, "gs40": {"h": 0, "a": 1}, "gs65": {"h": 1, "a": 0}, "gs66": {"h": 0, "a": 1}, "gs37": {"h": 2, "a": 0}, "gs39": {"h": 2, "a": 0}, "gs63": {"h": 0, "a": 1}, "gs64": {"h": 1, "a": 2}, "gs42": {"h": 3, "a": 0}, "gs43": {"h": 1, "a": 2}, "gs61": {"h": 2, "a": 2}, "gs62": {"h": 3, "a": 0}, "gs41": {"h": 1, "a": 0}, "gs44": {"h": 0, "a": 1}, "gs71": {"h": 1, "a": 0}, "gs72": {"h": 0, "a": 2}, "gs45": {"h": 2, "a": 0}, "gs48": {"h": 2, "a": 0}, "gs69": {"h": 1, "a": 2}, "gs70": {"h": 0, "a": 2}, "gs46": {"h": 1, "a": 1}, "gs47": {"h": 0, "a": 3}, "gs67": {"h": 0, "a": 2}, "gs68": {"h": 1, "a": 1}}, "iggylicious": {"gs01": {"h": 2, "a": 1}, "gs03": {"h": 2, "a": 1}, "gs04": {"h": 2, "a": 0}, "gs05": {"h": 0, "a": 2}, "gs06": {"h": 2, "a": 1}, "gs07": {"h": 0, "a": 2}, "gs08": {"h": 1, "a": 2}, "gs09": {"h": 3, "a": 0}, "gs10": {"h": 2, "a": 1}, "gs11": {"h": 0, "a": 1}, "gs12": {"h": 1, "a": 0}, "gs13": {"h": 4, "a": 1}, "gs14": {"h": 2, "a": 1}, "gs15": {"h": 0, "a": 1}, "gs17": {"h": 3, "a": 0}, "gs18": {"h": 1, "a": 4}, "gs19": {"h": 3, "a": 0}, "gs20": {"h": 1, "a": 1}, "gs21": {"h": 4, "a": 0}, "gs22": {"h": 3, "a": 2}, "gs23": {"h": 3, "a": 1}, "gs24": {"h": 0, "a": 2}}, "gerardo_m_": {"gs03": {"h": 1, "a": 2}, "gs04": {"h": 3, "a": 0}, "gs07": {"h": 2, "a": 1}, "gs05": {"h": 0, "a": 2}, "gs09": {"h": 4, "a": 0}, "gs10": {"h": 2, "a": 2}, "gs11": {"h": 0, "a": 1}, "gs12": {"h": 2, "a": 0}, "gs13": {"h": 2, "a": 0}, "gs14": {"h": 2, "a": 1}, "gs15": {"h": 2, "a": 2}, "gs16": {"h": 0, "a": 2}, "gs17": {"h": 3, "a": 0}, "gs18": {"h": 0, "a": 2}, "gs19": {"h": 3, "a": 0}, "gs20": {"h": 2, "a": 0}, "gs21": {"h": 3, "a": 0}, "gs22": {"h": 2, "a": 2}, "gs23": {"h": 1, "a": 1}, "gs24": {"h": 0, "a": 3}, "gs25": {"h": 1, "a": 2}, "gs26": {"h": 2, "a": 1}, "gs27": {"h": 1, "a": 1}, "gs28": {"h": 2, "a": 1}, "gs29": {"h": 2, "a": 1}, "gs30": {"h": 1, "a": 2}, "gs31": {"h": 3, "a": 2}, "gs32": {"h": 1, "a": 2}, "gs34": {"h": 4, "a": 0}, "gs33": {"h": 2, "a": 1}, "gs35": {"h": 2, "a": 1}, "gs36": {"h": 3, "a": 1}, "gs37": {"h": 3, "a": 1}, "gs39": {"h": 1, "a": 1}, "gs40": {"h": 2, "a": 0}, "gs41": {"h": 3, "a": 0}, "gs42": {"h": 4, "a": 0}, "gs43": {"h": 2, "a": 0}, "gs44": {"h": 1, "a": 1}, "gs45": {"h": 3, "a": 1}, "gs46": {"h": 3, "a": 0}, "gs47": {"h": 1, "a": 2}, "gs48": {"h": 3, "a": 0}, "gs49": {"h": 2, "a": 1}, "gs50": {"h": 2, "a": 1}, "gs51": {"h": 1, "a": 3}, "gs52": {"h": 2, "a": 2}, "gs53": {"h": 1, "a": 2}}, "leo": {"gs05": {"h": 0, "a": 3}, "gs06": {"h": 2, "a": 1}, "gs13": {"h": 2, "a": 0}, "gs14": {"h": 1, "a": 1}, "gs15": {"h": 1, "a": 2}, "gs17": {"h": 3, "a": 1}, "gs16": {"h": 1, "a": 1}, "gs18": {"h": 0, "a": 2}, "gs19": {"h": 2, "a": 1}, "gs20": {"h": 1, "a": 1}, "gs21": {"h": 2, "a": 0}, "gs22": {"h": 3, "a": 0}, "gs23": {"h": 1, "a": 1}, "gs24": {"h": 1, "a": 3}, "gs25": {"h": 2, "a": 0}, "gs26": {"h": 2, "a": 1}, "gs27": {"h": 1, "a": 1}, "gs28": {"h": 2, "a": 2}, "gs29": {"h": 4, "a": 1}}, "mike": {}}, "bonus": {"frank_pavon": {"champion": "Argentina", "topScorer": "Mbappe", "bestGk": "Joan Garcia", "upset": "Argentina beats Mexico", "runnerUp": "Portugal"}, "gabe": {"champion": "Spain", "runnerUp": "Ecuador", "topScorer": "Lamine Yamal", "bestGk": "William Pacho", "upset": "Austria beats Argentina in groups phase"}, "hill": {"champion": "France", "runnerUp": "Argentina", "topScorer": "Kylian Mbappé", "bestGk": "Alisson", "upset": "Morocco beats Brazil in the Quarterfinals"}, "sean": {"champion": "Spain", "runnerUp": "Portugal ", "bestGk": "England ", "topScorer": "Mbappé ", "upset": "Norway beats England"}, "jovita": {"champion": "Portugal", "runnerUp": "Spain", "topScorer": "Mbappe", "upset": "Argentina"}, "iggylicious": {"champion": "Spain", "runnerUp": "France", "topScorer": "Kylian Mbappe", "bestGk": "Thibaut Courtois", "upset": "USA beats Spain and disqualifies them"}, "gerardo_m_": {"champion": "Spain", "runnerUp": "France", "upset": "Colombia", "topScorer": "Lamine Yamal", "bestGk": "Unai Simón"}, "leo": {"champion": "France", "runnerUp": "Spain", "topScorer": "Mikel Oyarzabal", "bestGk": "Mike Maignan ", "upset": "Netherlands reaches Semi finals"}, "mike": {"champion": "Brazil", "runnerUp": "Germany ", "topScorer": "Lionel Messi", "bestGk": "Thibaut Courtois", "upset": "Japan beats Netherlands in Groups "}}, "awards": {}, "names": {"frank_pavon": "Frank Pavon", "gabe": "Gabe", "hill": "Hill", "sean": "Sean", "jovita": "Jovita", "iggylicious": "Iggylicious", "gerardo_m_": "Gerardo M.", "leo": "Leo", "mike": "Mike"}, "bonusLocked": false};

const matchStarted = (m) => !!(m.locked || (m.ko && Date.now() >= Date.parse(m.ko)));

const PRIZES = [
  { place: "1st", icon: "🥇", prize: "$100–150 gift card" },
  { place: "2nd", icon: "🥈", prize: "Team lunch, paid" },
  { place: "3rd", icon: "🥉", prize: "Desk trophy + snacks" },
];

const sanitize = (n) => n.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);

/* ── Supabase shared storage adapter ─────────────────────────
   Shared values go to Supabase table public.wc_store.
   Device-only values stay in localStorage so each PC/browser can keep its own
   selected user, device id, and commissioner unlock state. */
const memoryStore = new Map();
const localKey = (key) => `wcpl:device:${key}`;

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

function normalizeJson(value) {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = normalizeJson(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function jsonEqual(a, b) {
  return JSON.stringify(normalizeJson(a)) === JSON.stringify(normalizeJson(b));
}

function localGet(key) {
  const k = localKey(key);
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage.getItem(k);
  } catch { /* localStorage blocked */ }
  return memoryStore.has(k) ? memoryStore.get(k) : null;
}

function localSet(key, payload) {
  const k = localKey(key);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(k, payload);
      return true;
    }
  } catch { /* localStorage blocked */ }
  memoryStore.set(k, payload);
  return true;
}

async function sget(key, shared = true) {
  try {
    if (!shared) {
      const raw = localGet(key);
      return raw == null ? null : JSON.parse(raw);
    }

    // Missing Supabase env vars: keep the app usable for local testing, but it
    // will not be shared until VITE_SUPABASE_URL and a publishable/anon key exist.
    if (!supabase) {
      const raw = localGet(`shared:${key}`);
      return raw == null ? null : JSON.parse(raw);
    }

    const { data, error } = await withTimeout(
      supabase.from("wc_store").select("value").eq("key", key).maybeSingle(),
      10000
    );
    if (error) throw error;
    return data?.value ?? null;
  } catch (err) {
    console.warn("Storage read failed", key, err);
    return null;
  }
}

/* Shared writes go to Supabase. Device writes stay local. */
async function sset(key, val, shared = true, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      if (!shared) {
        const payload = JSON.stringify(val);
        localSet(key, payload);
        return JSON.parse(localGet(key)) === val || jsonEqual(JSON.parse(localGet(key)), val);
      }

      if (!supabase) {
        const payload = JSON.stringify(val);
        localSet(`shared:${key}`, payload);
        return jsonEqual(JSON.parse(localGet(`shared:${key}`)), val);
      }

      const { error } = await withTimeout(
        supabase
          .from("wc_store")
          .upsert(
            { key, value: val, updated_at: new Date().toISOString() },
            { onConflict: "key" }
          ),
        10000
      );
      if (error) throw error;

      const confirmed = await sget(key, true);
      if (jsonEqual(confirmed, val)) return true;
    } catch (err) {
      console.warn("Storage write failed", key, err);
    }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  return false;
}

/* stable per-device id so a claim knows which device owns it */
async function getDeviceId() {
  let id = await sget("wc:deviceid", false);
  if (!id) {
    id = "d_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await sset("wc:deviceid", id, false);
  }
  return id;
}

/* lightweight hash so the code isn't stored in plain text */
const hashCode = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return String(h);
};

/* Scoring: winner 3 / draw 4, exact +5, goal diff +2 */
function scorePrediction(p, m) {
  if (m.sh == null || m.sa == null || p == null) return null;
  const real = Math.sign(m.sh - m.sa);
  const pred = Math.sign(p.h - p.a);
  if (real !== pred) return 0;
  let pts = real === 0 ? 4 : 3;
  if (p.h === m.sh && p.a === m.sa) pts += 5;
  if (p.h - p.a === m.sh - m.sa) pts += 2;
  return pts;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@400;500;600;700&display=swap');
:root{
  --pitch:#0B3D2E; --pitch2:#0F4A38; --chalk:#F2EFE6;
  --chalk-dim:rgba(242,239,230,.55); --line:rgba(242,239,230,.16);
  --gold:#E3B341; --signal:#FF6B35; --ok:#7BD389;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--pitch)}
.app{min-height:100vh;background:
  radial-gradient(1200px 600px at 50% -200px, #14543F 0%, #0B3D2E 60%),
  #0B3D2E;
  color:var(--chalk);font-family:'Archivo',sans-serif;padding-bottom:80px}
.wrap{max-width:880px;margin:0 auto;padding:0 16px}
.hdr{padding:28px 0 18px;border-bottom:2px solid var(--line);
  background:repeating-linear-gradient(90deg,transparent 0 119px,rgba(255,255,255,.03) 119px 120px)}
.kick{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);font-weight:600}
h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,6vw,56px);line-height:.95;letter-spacing:.02em}
h1 em{font-style:normal;color:var(--gold)}
.sub{color:var(--chalk-dim);font-size:13px;margin-top:6px}
.tabs{display:flex;gap:4px;margin:18px 0 22px;border:1px solid var(--line);border-radius:10px;padding:4px;overflow-x:auto}
.tab{flex:1;min-width:90px;padding:10px 8px;border:none;border-radius:7px;background:transparent;color:var(--chalk-dim);
  font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.08em;cursor:pointer;white-space:nowrap}
.tab.on{background:var(--chalk);color:var(--pitch)}
.card{background:rgba(0,0,0,.22);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
.matchTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.mdate{font-size:12px;color:var(--chalk-dim)}
.badge{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.12em;padding:3px 10px;border-radius:99px;border:1px solid}
.badge.open{color:var(--ok);border-color:var(--ok)}
.badge.locked{color:var(--signal);border-color:var(--signal)}
.badge.final{color:var(--gold);border-color:var(--gold)}
.board{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;text-align:center;
  background:rgba(0,0,0,.35);border-radius:10px;padding:14px 10px;border:1px solid var(--line)}
.team{font-family:'Bebas Neue',sans-serif;font-size:clamp(20px,4vw,28px);letter-spacing:.04em}
.scoreBox{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,6vw,44px);color:var(--gold);min-width:86px;letter-spacing:.05em}
.predRow{display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap}
.numIn{width:54px;padding:8px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:22px;
  background:rgba(0,0,0,.4);border:1px solid var(--line);border-radius:8px;color:var(--chalk)}
.numIn:focus{outline:2px solid var(--gold);border-color:transparent}
.btn{padding:9px 16px;border:none;border-radius:8px;background:var(--gold);color:#1a1405;
  font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.08em;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--chalk)}
.btn.danger{background:transparent;border:1px solid var(--signal);color:var(--signal)}
.btn:disabled{opacity:.45;cursor:default}
.picks{margin-top:12px;border-top:1px dashed var(--line);padding-top:10px}
.pickLine{display:flex;justify-content:space-between;padding:5px 2px;font-size:14px}
.pickLine .pts{font-family:'Bebas Neue',sans-serif;font-size:17px;color:var(--gold)}
.muted{color:var(--chalk-dim);font-size:13px}
.lb{width:100%;border-collapse:collapse}
.lb td,.lb th{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left;font-size:14px}
.lb th{font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;font-size:15px;color:var(--chalk-dim)}
.lb .tot{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--gold);text-align:right}
.podium{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.pod{background:rgba(0,0,0,.28);border:1px solid var(--line);border-radius:12px;padding:14px 10px;text-align:center}
.pod.first{border-color:var(--gold)}
.pod .nm{font-family:'Bebas Neue',sans-serif;font-size:20px;margin:4px 0}
.pod .pz{font-size:11px;color:var(--chalk-dim)}
.pod .pp{font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--gold)}
.fld{width:100%;padding:10px;background:rgba(0,0,0,.4);border:1px solid var(--line);border-radius:8px;
  color:var(--chalk);font-family:'Archivo',sans-serif;font-size:14px;margin-top:4px}
.fld:focus{outline:2px solid var(--gold)}
label.lbl{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--chalk-dim);display:block;margin-top:12px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.chk{display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--chalk);color:var(--pitch);
  padding:10px 18px;border-radius:99px;font-weight:600;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.4);z-index:50}
.gate{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.gateCard{max-width:380px;width:100%;text-align:center}
@media(max-width:560px){.podium{grid-template-columns:1fr}.grid2{grid-template-columns:1fr}}
`;

export default function App() {
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [claims, setClaims] = useState({});       // {playerKey: deviceId}
  const [tab, setTab] = useState("matches");
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allPreds, setAllPreds] = useState({});   // {playerKey: {matchId:{h,a}}}
  const [allBonus, setAllBonus] = useState({});   // {playerKey: {champion:...}}
  const [awards, setAwards] = useState({});       // {playerKey: {champion:true}}
  const [names, setNames] = useState({});         // {playerKey: displayName}
  const [bonusLocked, setBonusLocked] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const pop = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [m, pl, aw, bl, cl] = await Promise.all([
      sget("wc:matches"), sget("wc:players"), sget("wc:awards"), sget("wc:bonuslocked"), sget("wc:claims"),
    ]);
    setClaims(cl || {});
    // Fresh copies often have no storage yet. Show the recovered league in memory
    // instead of presenting a blank roster. Nothing is overwritten until the
    // commissioner uses Restore or a user saves a change.
    const fallbackPlayers = (RECOVERED_BACKUP.players || []).map(k => ({
      key: k,
      name: (RECOVERED_BACKUP.names && RECOVERED_BACKUP.names[k]) || k,
    }));
    const playerList = (Array.isArray(pl) && pl.length) ? pl : fallbackPlayers;
    // Use stored matches if present; otherwise fall back to recovered results,
    // then to the built-in schedule.
    let matchList = (Array.isArray(m) && m.length) ? m :
      (Array.isArray(RECOVERED_BACKUP.matches) && RECOVERED_BACKUP.matches.length ? RECOVERED_BACKUP.matches : SEED_MATCHES);
    matchList = matchList.map(x => {
      if (x.ko == null) { const s = SEED_MATCHES.find(sm => sm.id === x.id); if (s) return { ...x, ko: s.ko }; }
      return x;
    });
    setMatches(matchList);
    setPlayers(playerList.map(p => p.key));
    setNames(Object.fromEntries(playerList.map(p => [p.key, p.name])));
    setAwards(aw || RECOVERED_BACKUP.awards || {});
    setBonusLocked(bl == null ? !!RECOVERED_BACKUP.bonusLocked : !!bl);
    const predEntries = await Promise.all(playerList.map(async p => [
      p.key,
      (await sget(`wc:preds:${p.key}`)) || RECOVERED_BACKUP.predictions?.[p.key] || {},
    ]));
    const bonusEntries = await Promise.all(playerList.map(async p => [
      p.key,
      (await sget(`wc:bonus:${p.key}`)) || RECOVERED_BACKUP.bonus?.[p.key] || {},
    ]));
    setAllPreds(Object.fromEntries(predEntries));
    setAllBonus(Object.fromEntries(bonusEntries));
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const dev = await getDeviceId();
      setDeviceId(dev);
      const saved = await sget("wc:me", false);
      const cl = (await sget("wc:claims")) || {};
      setClaims(cl);
      // only stay logged in if this device still owns the claim for that player
      if (saved && cl[saved.key] === dev) {
        setMe(saved);
      } else if (saved) {
        // claim was released by the commissioner, or taken by another device → sign out here
        await sset("wc:me", null, false);
        setMe(null);
      }
      const adminOk = await sget("wc:adminok", false);
      if (adminOk) setAdmin(true);
      await loadAll();
    })();
  }, [loadAll]);

  /* claim a player on this device — sign in instantly, persist in background */
  async function selectUser(key, name) {
    if (claims[key] && claims[key] !== deviceId) {
      pop("That name is in use — ask the commissioner to release it");
      return;
    }
    const dev = deviceId || await getDeviceId();
    if (!deviceId) setDeviceId(dev);
    setMe({ key, name });                     // in immediately; don't block on flaky writes
    setClaims(c => ({ ...c, [key]: dev }));
    sset("wc:me", { key, name }, false);
    sset("wc:claims", { ...claims, [key]: dev }).then(ok => {
      if (!ok) pop("⚠ Signed in, but storage is unreliable right now");
    });
    loadAll();
  }

  /* add a brand-new player (for someone not on the list), then claim it */
  async function addNewPlayer() {
    const display = nameInput.trim();
    if (!display) return;
    const key = sanitize(display);
    if (!key) return;
    const pl = (await sget("wc:players")) || [];
    if (!pl.find(p => p.key === key)) {
      pl.push({ key, name: display });
      const ok = await sset("wc:players", pl);
      if (!ok) { pop("⚠ Couldn't reach storage — try again"); return; }
    }
    setNameInput(""); setAddingNew(false);
    await selectUser(key, display);
  }

  /* sign out on this device and free the claim so it can be re-selected */
  async function signOut() {
    if (me) {
      const fresh = (await sget("wc:claims")) || {};
      if (fresh[me.key] === deviceId) { const n = { ...fresh }; delete n[me.key]; await sset("wc:claims", n); setClaims(n); }
      await sset("wc:me", null, false);
    }
    setMe(null);
  }

  /* commissioner: release any player's claim so it returns to the list */
  async function releaseClaim(key) {
    const fresh = (await sget("wc:claims")) || {};
    const next = { ...fresh }; delete next[key];
    const ok = await sset("wc:claims", next);
    if (ok) { setClaims(next); pop(`Released ${names[key] || key} ✓`); }
    else pop("⚠ Didn't save — try again");
  }

  /* ── totals ── */
  function totals() {
    return players.map(pk => {
      let matchPts = 0;
      for (const m of matches) {
        const s = scorePrediction(allPreds[pk]?.[m.id], m);
        if (s) matchPts += s;
      }
      let bonusPts = 0;
      for (const b of BONUS_DEFS) if (awards[pk]?.[b.key]) bonusPts += b.pts;
      return { key: pk, name: names[pk] || pk, matchPts, bonusPts, total: matchPts + bonusPts };
    }).sort((a, b) => b.total - a.total);
  }

  const savePredFor = useCallback(async (pk, mid, h, a) => {
    const mine = { ...(allPreds[pk] || {}), [mid]: { h, a } };
    const ok = await sset(`wc:preds:${pk}`, mine);
    if (ok) setAllPreds(p => ({ ...p, [pk]: mine }));
    return ok;
  }, [allPreds]);

  if (!me) {
    const roster = [...players].sort((a, b) => (names[a] || a).localeCompare(names[b] || b));
    return (
      <div className="app"><style>{css}</style>
        <div className="gate"><div className="card gateCard">
          <div className="kick">Office Pool · 2026</div>
          <h1>World Cup <em>Prediction League</em></h1>
          <p className="sub" style={{ margin: "10px 0 16px" }}>Select your name to enter. You only do this once on this device.</p>

          {loading && !roster.length && <p className="muted">Loading players…</p>}

          {roster.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {roster.map(k => {
                const taken = claims[k] && claims[k] !== deviceId;
                return (
                  <button key={k} className={`btn ${taken ? "ghost" : ""}`}
                    disabled={taken}
                    style={{ width: "100%", opacity: taken ? 0.5 : 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => selectUser(k, names[k] || k)}>
                    <span>{names[k] || k}</span>
                    {taken && <span style={{ fontSize: 11, letterSpacing: ".1em" }}>IN USE</span>}
                  </button>
                );
              })}
            </div>
          )}

          {!addingNew
            ? <button className="btn ghost" style={{ width: "100%" }} onClick={() => setAddingNew(true)}>+ Not on the list? Add your name</button>
            : <div>
                <input className="fld" placeholder="Type your name" value={nameInput}
                  onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewPlayer()} />
                <div className="predRow" style={{ marginTop: 10 }}>
                  <button className="btn" disabled={!nameInput.trim()} onClick={addNewPlayer}>Add & enter</button>
                  <button className="btn ghost" onClick={() => { setAddingNew(false); setNameInput(""); }}>Cancel</button>
                </div>
              </div>}

          <p className="muted" style={{ marginTop: 14 }}>Picked the wrong name? The commissioner can release it from the Commissioner tab.</p>
        </div></div>
      </div>
    );
  }

  return (
    <div className="app"><style>{css}</style>
      <div className="hdr"><div className="wrap">
        <div className="kick" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Office Pool · 2026 · {me.name}</span>
          <button onClick={signOut}
            style={{ background: "none", border: "1px solid var(--line)", color: "var(--chalk-dim)", borderRadius: 6, padding: "3px 9px", fontSize: 11, letterSpacing: ".1em", cursor: "pointer", fontFamily: "'Archivo',sans-serif" }}>
            SWITCH USER
          </button>
        </div>
        <h1>World Cup <em>Prediction League</em></h1>
        <div className="sub">Winner 3 · Draw 4 · Exact +5 · Goal diff +2</div>
      </div></div>

      <div className="wrap">
        <div className="tabs">
          {[["matches", "Matches"], ["table", "Leaderboard"], ["bonus", "Bonus Picks"], ["admin", "Commissioner"]].map(([k, l]) =>
            <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}
        </div>

        {loading && <p className="muted">Loading league data…</p>}

        {tab === "matches" && <Matches matches={matches} me={me} allPreds={allPreds} names={names}
          onSave={async (mid, h, a) => {
            const m = matches.find(x => x.id === mid);
            if (!m || m.sh != null || matchStarted(m)) {
              pop("Picks are closed — ask the commissioner for changes");
              return false;
            }
            const ok = await savePredFor(me.key, mid, h, a);
            pop(ok ? "Saved ✓" : "⚠ Didn't save — check connection & try again");
            return ok;
          }} />}

        {tab === "table" && <Leaderboard rows={totals()} meKey={me.key} />}

        {tab === "bonus" && <Bonus me={me} mine={allBonus[me.key] || {}} locked={bonusLocked}
          onSave={async (vals) => {
            const ok = await sset(`wc:bonus:${me.key}`, vals);
            if (ok) setAllBonus(b => ({ ...b, [me.key]: vals }));
            pop(ok ? "Bonus picks saved ✓" : "⚠ Didn't save — try again");
            return ok;
          }} />}

        {tab === "admin" && <Admin admin={admin} setAdmin={setAdmin} matches={matches} players={players}
          names={names} allBonus={allBonus} awards={awards} bonusLocked={bonusLocked}
          allPreds={allPreds} savePredFor={savePredFor} reload={loadAll}
          claims={claims} releaseClaim={releaseClaim} deviceId={deviceId}
          saveMatches={async (m) => { const ok = await sset("wc:matches", m); if (ok) setMatches(m); return ok; }}
          saveAwards={async (a) => { const ok = await sset("wc:awards", a); if (ok) setAwards(a); return ok; }}
          setBonusLock={async (v) => { const ok = await sset("wc:bonuslocked", v); if (ok) setBonusLocked(v); return ok; }}
          pop={pop} />}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button className="btn ghost" onClick={loadAll}>↻ Refresh league data</button>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ── Matches tab ── */
function Matches({ matches, me, allPreds, names, onSave }) {
  const [grp, setGrp] = useState("ALL");
  const [hideFinal, setHideFinal] = useState(false);
  if (!matches.length) return <div className="card"><p className="muted">No matches yet. The commissioner adds fixtures in the Commissioner tab.</p></div>;
  const groups = [...new Set(matches.map(m => m.g).filter(Boolean))].sort();
  const sorted = [...matches].sort((a, b) => (a.ord ?? 1e9) - (b.ord ?? 1e9));
  const shown = sorted.filter(m =>
    (grp === "ALL" || m.g === grp) && (!hideFinal || m.sh == null));
  return (
    <div>
      <div className="predRow" style={{ marginBottom: 14, marginTop: 0 }}>
        <select className="fld" style={{ width: "auto", marginTop: 0 }} value={grp} onChange={e => setGrp(e.target.value)}>
          <option value="ALL">All groups</option>
          {groups.map(g => <option key={g} value={g}>Group {g}</option>)}
        </select>
        <label className="chk" style={{ padding: 0 }}>
          <input type="checkbox" checked={hideFinal} onChange={e => setHideFinal(e.target.checked)} />
          <span>Hide finished</span>
        </label>
        <span className="muted">{shown.length} of {matches.length} matches</span>
      </div>
      {shown.map(m => <MatchCard key={m.id} m={m} me={me} allPreds={allPreds} names={names} onSave={onSave} />)}
    </div>
  );
}

function MatchCard({ m, me, allPreds, names, onSave }) {
  const mine = allPreds[me.key]?.[m.id];
  const [h, setH] = useState(mine?.h ?? "");
  const [a, setA] = useState(mine?.a ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const finished = m.sh != null;
  const started = !finished && matchStarted(m);
  const status = finished ? "final" : started ? "locked" : "open";
  const reveal = finished || started;

  async function doSave() {
    setSaving(true); setFailed(false);
    const ok = await onSave(m.id, Number(h), Number(a));
    setSaving(false); setFailed(!ok);
  }

  return (
    <div className="card">
      <div className="matchTop">
        <span className="mdate">{m.g ? `Group ${m.g} · ` : ""}{m.date || "TBD"}</span>
        <span className={`badge ${status}`}>{status === "final" ? "FULL TIME" : status === "locked" ? "LOCKED" : "OPEN"}</span>
      </div>
      <div className="board">
        <div className="team">{m.home}</div>
        <div className="scoreBox">{finished ? `${m.sh} – ${m.sa}` : "VS"}</div>
        <div className="team">{m.away}</div>
      </div>

      {!reveal && (
        <div className="predRow">
          <span className="muted">My pick:</span>
          <input className="numIn" type="number" min="0" value={h} onChange={e => setH(e.target.value)} aria-label={`${m.home} goals`} />
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20 }}>–</span>
          <input className="numIn" type="number" min="0" value={a} onChange={e => setA(e.target.value)} aria-label={`${m.away} goals`} />
          <button className="btn" disabled={h === "" || a === "" || saving} onClick={doSave}>
            {saving ? "Saving…" : mine ? "Update" : "Save"}
          </button>
          {!saving && mine && !failed && <span style={{ color: "var(--ok)" }}>✓ Saved {mine.h}–{mine.a}</span>}
          {!saving && failed && <span style={{ color: "var(--signal)" }}>✗ Not saved — try again</span>}
        </div>
      )}
      {!reveal && <p className="muted" style={{ marginTop: 8 }}>Picks close automatically at kickoff. Everyone's picks stay hidden until then. After kickoff, only the commissioner can change a pick.</p>}

      {reveal && (
        <div className="picks">
          {Object.entries(allPreds).map(([pk, preds]) => {
            const p = preds[m.id];
            const pts = finished ? scorePrediction(p, m) : null;
            return (
              <div className="pickLine" key={pk}>
                <span>{names[pk] || pk}{pk === me.key ? " (you)" : ""}</span>
                <span>{p ? `${p.h}–${p.a}` : <span className="muted">no pick</span>}
                  {finished && p != null && <span className="pts">  +{pts}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Leaderboard ── */
function Leaderboard({ rows, meKey }) {
  const top3 = rows.slice(0, 3);
  return (
    <div>
      <div className="podium">
        {top3.map((r, i) => (
          <div key={r.key} className={`pod ${i === 0 ? "first" : ""}`}>
            <div style={{ fontSize: 22 }}>{PRIZES[i].icon}</div>
            <div className="nm">{r.name}</div>
            <div className="pp">{r.total}</div>
            <div className="pz">{PRIZES[i].prize}</div>
          </div>
        ))}
        {top3.length === 0 && <div className="card" style={{ gridColumn: "1/-1" }}><p className="muted">No players yet.</p></div>}
      </div>
      <div className="card">
        <table className="lb">
          <thead><tr><th>#</th><th>Player</th><th>Matches</th><th>Bonus</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} style={r.key === meKey ? { background: "rgba(227,179,65,.08)" } : null}>
                <td>{i + 1}</td><td>{r.name}</td><td>{r.matchPts}</td><td>{r.bonusPts}</td>
                <td className="tot">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Bonus picks ── */
function Bonus({ mine, locked, onSave }) {
  const [vals, setVals] = useState(mine);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setVals(mine), [mine]);
  async function doSave() {
    setSaving(true); setMsg("");
    const ok = await onSave(vals);
    setSaving(false); setMsg(ok ? "✓ Saved" : "✗ Not saved — try again");
  }
  return (
    <div className="card">
      <p className="muted">Submit before the tournament starts. The commissioner awards points at the end.</p>
      {BONUS_DEFS.map(b => (
        <div key={b.key}>
          <label className="lbl">{b.icon} {b.label} <span style={{ color: "var(--gold)" }}>+{b.pts} pts</span></label>
          <input className="fld" disabled={locked} value={vals[b.key] || ""}
            placeholder={b.key === "upset" ? "e.g. Ecuador beats Germany in groups" : "Your pick"}
            onChange={e => setVals(v => ({ ...v, [b.key]: e.target.value }))} />
        </div>
      ))}
      {locked
        ? <p className="muted" style={{ marginTop: 14 }}>Bonus picks are locked for the tournament.</p>
        : <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn" disabled={saving} onClick={doSave}>{saving ? "Saving…" : "Save bonus picks"}</button>
            {msg && <span style={{ color: msg[0] === "✓" ? "var(--ok)" : "var(--signal)" }}>{msg}</span>}
          </div>}
    </div>
  );
}

/* ── Commissioner ── */
function Admin({ admin, setAdmin, matches, players, names, allBonus, awards, bonusLocked,
  allPreds, savePredFor, saveMatches, saveAwards, setBonusLock, reload, claims, releaseClaim, deviceId, pop }) {
  const [home, setHome] = useState(""), [away, setAway] = useState(""), [date, setDate] = useState("");
  const [storedHash, setStoredHash] = useState(undefined); // undefined = loading, null = not set
  const [codeIn, setCodeIn] = useState("");
  const [backupText, setBackupText] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!admin) sget("wc:admincode").then(h => setStoredHash(h ?? null));
  }, [admin]);

  async function unlock() {
    const code = codeIn.trim();
    if (code.length < 4) { pop("Code must be at least 4 characters"); return; }
    if (storedHash === null) {
      /* first-time setup: whoever opens this first creates the code */
      await sset("wc:admincode", hashCode(code));
      await sset("wc:adminok", true, false);
      setAdmin(true); pop("Commissioner code set — you're in");
    } else if (hashCode(code) === storedHash) {
      await sset("wc:adminok", true, false);
      setAdmin(true); pop("Welcome, commissioner");
    } else {
      pop("Wrong code");
    }
    setCodeIn("");
  }

  if (!admin) {
    if (storedHash === undefined) return <div className="card"><p className="muted">Loading…</p></div>;
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted" style={{ marginBottom: 12 }}>
          {storedHash === null
            ? "No commissioner code exists yet. Create one now — you'll be the league commissioner, and only people with this code can manage fixtures, results, and bonus awards."
            : "Commissioner access is code-protected. Enter the code once and this device stays unlocked."}
        </p>
        <input className="fld" type="password" style={{ maxWidth: 260, margin: "0 auto" }}
          placeholder={storedHash === null ? "Create a code (min 4 chars)" : "Commissioner code"}
          value={codeIn} onChange={e => setCodeIn(e.target.value)}
          onKeyDown={e => e.key === "Enter" && unlock()} />
        <div>
          <button className="btn" style={{ marginTop: 14 }} onClick={unlock}>
            {storedHash === null ? "Set code & enter" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  async function addMatch() {
    if (!home.trim() || !away.trim()) return;
    const next = [...matches, { id: `m_${Date.now()}`, ord: 100 + matches.length, home: home.trim(), away: away.trim(), date, locked: false, sh: null, sa: null }];
    const ok = await saveMatches(next);
    if (ok) { setHome(""); setAway(""); setDate(""); }
    pop(ok ? "Match added ✓" : "⚠ Didn't save — try again");
  }
  async function restoreSchedule() {
    const have = new Set(matches.map(m => m.id));
    const missing = SEED_MATCHES.filter(s => !have.has(s.id));
    if (!missing.length) { pop("Official schedule already loaded"); return; }
    const ok = await saveMatches([...matches, ...missing]);
    pop(ok ? `Added ${missing.length} fixtures ✓` : "⚠ Didn't save — try again");
  }
  async function update(id, patch) {
    return await saveMatches(matches.map(m => m.id === id ? { ...m, ...patch } : m));
  }
  async function remove(id) {
    const ok = await saveMatches(matches.filter(m => m.id !== id));
    pop(ok ? "Match removed ✓" : "⚠ Didn't save — try again");
  }

  /* One-click restore of the recovered league into storage (verified writes). */
  async function restoreLeague() {
    setRestoring(true); setRestoreMsg("");
    const B = RECOVERED_BACKUP;
    const playersList = B.players.map(k => ({ key: k, name: (B.names && B.names[k]) || k }));
    const writes = [
      ["wc:players", playersList],
      ["wc:matches", B.matches],
      ["wc:awards", B.awards || {}],
      ["wc:bonuslocked", !!B.bonusLocked],
    ];
    for (const k of B.players) {
      writes.push([`wc:preds:${k}`, (B.predictions && B.predictions[k]) || {}]);
      writes.push([`wc:bonus:${k}`, (B.bonus && B.bonus[k]) || {}]);
    }
    let done = 0; const failed = [];
    for (const [k, v] of writes) {
      const ok = await sset(k, v);
      if (ok) done++; else failed.push(k);
      setRestoreMsg(`Restoring… ${done}/${writes.length}`);
    }
    setRestoring(false);
    if (failed.length === 0) {
      setRestoreMsg(`✓ Restored all ${writes.length} records. Reloading…`);
      setTimeout(() => reload && reload(), 800);
    } else {
      setRestoreMsg(`⚠ ${done}/${writes.length} saved; ${failed.length} failed (storage unreliable). Tap Restore again to retry the rest.`);
    }
  }

  /* Read-only full backup — pulls every key straight from storage, writes nothing */
  async function exportBackup() {
    const plist = (await sget("wc:players")) || [];
    const data = {
      app: "office-world-cup-prediction-league",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      players: plist,
      matches: (await sget("wc:matches")) || [],
      awards: (await sget("wc:awards")) || {},
      bonusLocked: !!(await sget("wc:bonuslocked")),
      adminCodeHash: (await sget("wc:admincode")) || null,
      predictions: {},
      bonus: {},
    };
    for (const p of plist) {
      data.predictions[p.key] = (await sget(`wc:preds:${p.key}`)) || {};
      data.bonus[p.key] = (await sget(`wc:bonus:${p.key}`)) || {};
    }
    const json = JSON.stringify(data, null, 2);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wc-league-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch { /* download blocked in sandbox — textarea fallback below still works */ }
    setBackupText(json);
    pop(`Backup ready · ${plist.length} players`);
  }
  async function copyBackup() {
    try { await navigator.clipboard.writeText(backupText); pop("Copied to clipboard"); }
    catch { pop("Select the text below and copy manually"); }
  }

  return (
    <div>
      <div className="card">
        <strong style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".06em" }}>Add fixture</strong>
        <div className="grid2">
          <div><label className="lbl">Home</label><input className="fld" value={home} onChange={e => setHome(e.target.value)} placeholder="Ecuador" /></div>
          <div><label className="lbl">Away</label><input className="fld" value={away} onChange={e => setAway(e.target.value)} placeholder="Germany" /></div>
        </div>
        <label className="lbl">Kickoff (label)</label>
        <input className="fld" value={date} onChange={e => setDate(e.target.value)} placeholder="2026-06-14 3:00 PM ET" />
        <div className="predRow">
          <button className="btn" onClick={addMatch}>Add match</button>
          <button className="btn ghost" onClick={restoreSchedule}>Restore official group stage</button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>Knockout rounds (Round of 32 onward) get added here once the matchups are set — June 28 through the July 19 final.</p>
      </div>

      {matches.map(m => <AdminMatch key={m.id} m={m} update={update} remove={remove} pop={pop}
        players={players} names={names} allPreds={allPreds} savePredFor={savePredFor} />)}

      <div className="card">
        <strong style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".06em" }}>Bonus picks</strong>
        <div style={{ margin: "10px 0" }}>
          <button className="btn ghost" onClick={() => setBonusLock(!bonusLocked)}>
            {bonusLocked ? "Unlock bonus submissions" : "Lock bonus submissions"}
          </button>
        </div>
        <p className="muted">Check each correct call to award points:</p>
        {players.map(pk => (
          <div key={pk} style={{ borderTop: "1px dashed var(--line)", paddingTop: 8, marginTop: 8 }}>
            <strong>{names[pk] || pk}</strong>
            {BONUS_DEFS.map(b => (
              <label className="chk" key={b.key}>
                <input type="checkbox" checked={!!awards[pk]?.[b.key]}
                  onChange={async e => {
                    const next = { ...awards, [pk]: { ...(awards[pk] || {}), [b.key]: e.target.checked } };
                    const ok = await saveAwards(next);
                    if (!ok) pop("⚠ Award didn't save — try again");
                  }} />
                <span>{b.icon} {b.label} (+{b.pts}) — <span className="muted">{allBonus[pk]?.[b.key] || "no pick"}</span></span>
              </label>
            ))}
          </div>
        ))}
        {!players.length && <p className="muted">No players yet.</p>}
      </div>

      <div className="card">
        <strong style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".06em" }}>Player access</strong>
        <p className="muted" style={{ margin: "8px 0 10px" }}>
          Everyone claims their name once from the sign-in list. If someone grabbed the wrong name, release it here so
          the right person can pick it. Releasing also signs that name out on the device that was using it (next time it loads).
        </p>
        {players.map(pk => {
          const claimed = !!claims[pk];
          return (
            <div key={pk} className="predRow" style={{ marginTop: 6, justifyContent: "space-between" }}>
              <span>{names[pk] || pk}{" "}
                {claimed
                  ? <span style={{ color: "var(--ok)", fontSize: 12 }}>· claimed</span>
                  : <span className="muted" style={{ fontSize: 12 }}>· available</span>}
              </span>
              <button className="btn ghost" disabled={!claimed} onClick={() => releaseClaim(pk)}>Release</button>
            </div>
          );
        })}
        {!players.length && <p className="muted">No players yet.</p>}
      </div>

      <div className="card">
        <strong style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".06em" }}>Restore recovered league</strong>
        <p className="muted" style={{ margin: "8px 0 12px" }}>
          Loads the league recovered earlier ({RECOVERED_BACKUP.players.length} players, all picks, bonus picks and results)
          into this app. Run this <strong>once</strong> on a fresh copy. It overwrites whatever is currently stored, and each
          write is verified, so it tells you if storage didn't cooperate.
        </p>
        <div className="predRow" style={{ marginTop: 0 }}>
          {!armed ? (
            <button className="btn" disabled={restoring} onClick={() => setArmed(true)}>↺ Restore recovered league</button>
          ) : (
            <>
              <button className="btn danger" disabled={restoring}
                onClick={async () => { await restoreLeague(); setArmed(false); }}>
                {restoring ? "Restoring…" : "⚠ Confirm — overwrite & restore"}
              </button>
              <button className="btn ghost" disabled={restoring} onClick={() => setArmed(false)}>Cancel</button>
            </>
          )}
          {restoreMsg && <span style={{ color: restoreMsg[0] === "✓" ? "var(--ok)" : restoreMsg[0] === "⚠" ? "var(--signal)" : "var(--chalk-dim)" }}>{restoreMsg}</span>}
        </div>
      </div>

      <div className="card">
        <strong style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: ".06em" }}>Backup &amp; data</strong>
        <p className="muted" style={{ margin: "8px 0 12px" }}>
          Downloads the entire league — players, every pick, results, bonus picks and awards — as a JSON file.
          This only reads your data; it changes and erases nothing. Keep the file somewhere safe; it's also what
          imports your scores into the self-hosted version later.
        </p>
        <div className="predRow" style={{ marginTop: 0 }}>
          <button className="btn" onClick={exportBackup}>⬇ Export backup</button>
          {backupText && <button className="btn ghost" onClick={copyBackup}>Copy to clipboard</button>}
        </div>
        {backupText && (
          <>
            <p className="muted" style={{ marginTop: 12 }}>
              If the download didn't start, select everything below and copy it into a text file:
            </p>
            <textarea className="fld" readOnly value={backupText}
              onFocus={e => e.target.select()}
              style={{ height: 160, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre", marginTop: 6 }} />
          </>
        )}
      </div>
    </div>
  );
}

function AdminMatch({ m, update, remove, pop, players, names, allPreds, savePredFor }) {
  const [sh, setSh] = useState(m.sh ?? ""), [sa, setSa] = useState(m.sa ?? "");
  const [editPicks, setEditPicks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  async function saveFinal() {
    setSaving(true); setResult("");
    const ok = await update(m.id, { sh: Number(sh), sa: Number(sa), locked: true });
    setSaving(false); setResult(ok ? "✓ Saved — points awarded" : "✗ Not saved — try again");
  }
  async function toggleLock() {
    const ok = await update(m.id, { locked: !m.locked });
    if (!ok) pop("⚠ Didn't save — try again");
  }
  return (
    <div className="card">
      <div className="matchTop">
        <strong>{m.home} vs {m.away}</strong>
        <span className="mdate">{m.g ? `Group ${m.g} · ` : ""}{m.date}</span>
      </div>
      <div className="predRow">
        <button className="btn ghost" onClick={toggleLock}>
          {m.locked ? "Unlock picks" : "Lock picks"}
        </button>
        <input className="numIn" type="number" min="0" value={sh} onChange={e => setSh(e.target.value)} aria-label="Home final score" />
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20 }}>–</span>
        <input className="numIn" type="number" min="0" value={sa} onChange={e => setSa(e.target.value)} aria-label="Away final score" />
        <button className="btn" disabled={sh === "" || sa === "" || saving} onClick={saveFinal}>
          {saving ? "Saving…" : "Final score"}
        </button>
        <button className="btn ghost" onClick={() => setEditPicks(v => !v)}>{editPicks ? "Hide picks" : "Edit picks"}</button>
        <button className="btn danger" onClick={() => remove(m.id)}>Remove</button>
      </div>
      {result && <p style={{ marginTop: 8, color: result[0] === "✓" ? "var(--ok)" : "var(--signal)" }}>{result}</p>}
      {m.sh != null && !result && <p className="muted" style={{ marginTop: 8 }}>Recorded: {m.sh}–{m.sa}. Re-enter to correct.</p>}
      {editPicks && (
        <div className="picks">
          <p className="muted" style={{ marginBottom: 6 }}>Commissioner override — use this when a player requests a change.</p>
          {players.map(pk => <AdminPickRow key={pk} pk={pk} name={names[pk] || pk}
            pred={allPreds[pk]?.[m.id]} onSave={async (h, a) => await savePredFor(pk, m.id, h, a)} />)}
          {!players.length && <p className="muted">No players yet.</p>}
        </div>
      )}
    </div>
  );
}

function AdminPickRow({ name, pred, onSave }) {
  const [h, setH] = useState(pred?.h ?? ""), [a, setA] = useState(pred?.a ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  async function doSave() {
    setSaving(true); setMsg("");
    const ok = await onSave(Number(h), Number(a));
    setSaving(false); setMsg(ok ? "✓ saved" : "✗ retry");
  }
  return (
    <div className="predRow" style={{ marginTop: 6 }}>
      <span style={{ minWidth: 110 }}>{name}</span>
      <input className="numIn" type="number" min="0" value={h} onChange={e => setH(e.target.value)} aria-label={`${name} home goals`} />
      <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20 }}>–</span>
      <input className="numIn" type="number" min="0" value={a} onChange={e => setA(e.target.value)} aria-label={`${name} away goals`} />
      <button className="btn ghost" disabled={h === "" || a === "" || saving} onClick={doSave}>{saving ? "…" : "Save"}</button>
      {msg ? <span style={{ color: msg[0] === "✓" ? "var(--ok)" : "var(--signal)" }}>{msg}</span>
           : pred && <span className="muted">current: {pred.h}–{pred.a}</span>}
    </div>
  );
}

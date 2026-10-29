# Kidstv: the girls' version

Kidstv is couch-tv set up for three girls: **Blake (9), Lucy (4) and Sora (2)**. Everything couch-tv
does still works (README.md). On top of it:

| What | How it works |
|---|---|
| **Each girl has her own colour and emoji** | Blake 🦋 purple, Lucy 🌈 pink, Sora 🐣 teal. Her emoji is on the round head icon at the top left, and the focus ring around the apps turns her colour when she is picked. |
| **Only the kids' apps on the home row** | YouTube Kids, Disney+, Netflix and Prime Video, in that order. Every other app is behind **More apps**. |
| **Grown-ups only: More apps and Settings** | Both ask for a 4 digit PIN. Type it with the number keys on the remote, or move around the on-screen keypad with the arrows and press OK. The right PIN keeps them open for 5 minutes. |
| **Bedtime** | From 7:30 pm (8:00 pm on Friday and Saturday nights) until 7:00 am the home shows **"Goodnight, Blake, Lucy and Sora!"** over the starry night, and opens nothing. A grown-up presses OK, types the PIN and picks **15 more minutes**, **30 more minutes** or **Until morning**. |
| **Kid scenes** | Three drawn scenes take turns behind the big clock: Rainbow day, Candy sunset and Starry night. The hills sit in front of the clock's digits. |

## Change it

All of it lives in `config.json` (copy `config.example.json`), under `people` and `home.kids`:

```json
"people": [
  { "id": "blake", "name": "Blake", "colour": "#8e5cff", "app_profiles": ["Blake"] },
  { "id": "lucy", "name": "Lucy", "colour": "#ff5fa8", "app_profiles": ["Lucy", "Kids"] },
  { "id": "sora", "name": "Sora", "colour": "#2fc4b2", "app_profiles": ["Sora", "Kids"] }
],
"app_profile_fallback": ["Kids", "Children"],
"home": {
  "scenes": ["rainbow", "candy", "stars"],
  "kids": {
    "enabled": true,
    "emoji": { "blake": "🦋", "lucy": "🌈", "sora": "🐣" },
    "home_apps": ["com.google.android.youtube.tvkids", "com.disney.disneyplus", "com.netflix.ninja", "com.amazon.amazonvideo.livingroom"],
    "pin": "1234",
    "bedtime": { "from": "19:30", "until": "07:00", "weekend_from": "20:00" },
    "unlock_minutes": 5
  }
}
```

- **`colour`**: any hex colour, per girl.
- **`app_profiles`**: her profile name inside Netflix, Disney+ and Prime Video, so "put on Bluey"
  (option B) picks her profile on the "Who's watching?" screen. Make each girl a **Kids profile**
  in those apps (Netflix, Disney+ and Prime Video all have one) and use that name here.
- **`emoji`**: by person id. Any emoji the TV's font has.
- **`home_apps`**: Android package names, in order (the name in the app's Play Store web address,
  after `id=`). Leave the list empty (`[]`) to put every app on the home row, as couch-tv does.
- **`pin`**: four digits. **Change it from 1234 before you install.** `""` turns the grown-up lock off.
- **`bedtime`**: 24 hour times. `weekend_from` is Friday and Saturday nights; leave it out for the
  same time every night. `"bedtime": null` turns bedtime off.
- **`unlock_minutes`**: how long a right PIN keeps More apps and Settings open (1 to 120).
- **`enabled`**: `false` turns all of Kidstv off and you are back to plain couch-tv.

Without a `config.json` (option C, the app that lives on the TV), the same values are built into
`tv-home/web/kids.js` (`DEFAULTS`), so change them there too if you use option C. People you add
in Home settings on the TV get an id from their name ("Blake" becomes `blake`), so the emoji still
match.

## Bedtime when a show is already on

The home can only show the bedtime screen when the TV is on the home. So:

- **Option B (a computer at home):** at bedtime the bridge presses **Home** on the TV once, so
  whatever is playing stops and the girls land on "Goodnight". If a grown-up gives extra time, it
  presses Home again when the extra time runs out. Android and Google TVs only (on a Samsung,
  Home opens Samsung's own menu, so it is left alone there).
- **Options A and C:** the show carries on until someone goes back to the home, and then bedtime
  is waiting. Pair it with the TV's own sleep timer.

## What it is not

- The PIN keeps little hands out of More apps, Settings and bedtime. It is not security: it sits in
  the TV's settings file, which anyone on your Wi-Fi with the phone remote can read. Use each
  app's own parental controls (Netflix, Disney+ and Prime Video Kids profiles and their PINs,
  YouTube Kids' age settings) for what the girls can watch inside each app.
- The phone remote is the grown-ups' remote: it can open any app, at any time.
- The TV's own Settings (Android) are still reachable from the TV's Settings button on some remotes.

## Make the scenes again

The three kid scenes are drawn, not photographed. To change their colours, edit
`tv-home/tools/make-kids-scenes.py` and run:

```sh
python3 tv-home/tools/make-kids-scenes.py
```

It writes `scene-rainbow`, `scene-candy` and `scene-stars` (the picture, the clock's glass fill and
the hills in front of the clock) into `tv-home/web/backgrounds/`. The clock's position for each is
in `tv-home/web/kids.css`. The original five photo scenes are still there: add
`"night", "golden", "water", "fog", "dawn"` to `home.scenes` to have them take turns too.

## Try it on a computer

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/tv-home/web/index.html?mock=1` (arrows, Enter and Escape are the
remote). Bedtime follows the computer's clock.

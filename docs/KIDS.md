# Kidstv: the girls' version

Kidstv is couch-tv set up for three girls: **Blake (9), Lucy (4) and Sora (2)**. Everything couch-tv
does still works (README.md). On top of it:

| What | How it works |
|---|---|
| **Each girl has her own colour and emoji** | Blake 🦋 purple, Lucy 🌈 pink, Sora 🐣 teal. Her emoji is on the round head icon at the top left, and the focus ring around the apps turns her colour when she is picked. |
| **Only the kids' apps on the home row** | YouTube, Disney+, Netflix and Prime Video, in that order. Every other app is behind **More apps**. |
| **Grown-ups only: More apps and Settings** | Both ask for a 4 digit PIN. The first time, the TV asks a grown-up to **make** the PIN (typed twice). Type it with the number keys on the remote, or move around the on-screen keypad with the arrows and press OK. The right PIN keeps them open for 5 minutes. Change it from the Settings tile, **Grown-ups PIN**. |
| **Bedtime** | From 7:30 pm (8:00 pm on Friday and Saturday nights) until 7:00 am the home shows **"Goodnight, Blake, Lucy and Sora!"** over the starry night, and opens nothing. A grown-up presses OK, types the PIN and picks **15 more minutes**, **30 more minutes** or **Until morning**. |
| **Each girl's own picture and a big clock** | Blake's lavender hills, Lucy's candy sunset, Sora's mint meadow, behind a big rounded clock in front of everything, the date and weather above it and "Good afternoon, Blake" under it. The app tiles sit smaller, a little see-through, in a frosted bar. The designs are in `design/mockups`. |

## YouTube, with a YouTube Kids profile for each girl

Google retired the separate YouTube Kids app on TVs in 2024 (that is why the Play Store does not
have it). YouTube Kids now lives **inside the normal YouTube app** as a profile:

1. On the TV, open YouTube and sign in with your Google account.
2. Pick your account picture, then **Set up YouTube Kids**, and make a profile for each girl (her
   age decides what she sees). Profiles made on your phone show up too.
3. Each girl then picks her own profile under "Who's watching?". Google's own steps:
   [support.google.com/youtubekids](https://support.google.com/youtubekids/?p=ytk_tvs).

## Change it

All of it lives in `config.json` (copy `config.example.json`), under `people` and `home.kids`:

```json
"people": [
  { "id": "lucy", "name": "Lucy", "colour": "#ff5fa8", "app_profiles": ["Lucy", "Kids"] },
  { "id": "blake", "name": "Blake", "colour": "#8e5cff", "app_profiles": ["Blake"] },
  { "id": "sora", "name": "Sora", "colour": "#2fc4b2", "app_profiles": ["Sora", "Kids"] }
],
"app_profile_fallback": ["Kids", "Children"],
"home": {
  "scenes": ["rainbow", "candy", "stars"],
  "kids": {
    "enabled": true,
    "emoji": { "blake": "🦋", "lucy": "🌈", "sora": "🐣" },
    "home_apps": ["com.google.android.youtube.tv", "com.disney.disneyplus", "com.netflix.ninja", "com.amazon.amazonvideo.livingroom"],
    "pin": null,
    "bedtime": { "from": "19:30", "until": "07:00", "weekend_from": "20:00" },
    "unlock_minutes": 15,
    "little": ["sora"],
    "wind_down": 15,
    "dim_at": 5
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
- **`pin`**: `null` (the default): a grown-up makes the PIN on the TV the first time it is needed,
  and it is kept on the TV only, never in `config.json` or git. Four digits (`"2468"`): start with
  that one. `false`: no grown-up lock at all. A PIN made or changed on the TV wins over this.
  Forgot it? Clear the home app's storage from Android's own Settings, Apps (that resets the
  home's other settings too).
- **`bedtime`**: 24 hour times. `weekend_from` is Friday and Saturday nights; leave it out for the
  same time every night. `"bedtime": null` turns bedtime off.
- **`unlock_minutes`**: how long a right PIN keeps the grown-ups screen open (1 to 120). It counts
  down on that screen.
- **`little`**: person ids in little mode (below). Switched per girl from the grown-ups screen too.
- **`wind_down`** and **`dim_at`**: minutes before bedtime when the moon starts counting down at
  the top right, and when the home dims and says "Nearly bedtime".
- **`enabled`**: `false` turns all of Kidstv off and you are back to plain couch-tv.

Without a `config.json` (option C, the app that lives on the TV), the same values are built into
`tv-home/web/kids.js` (`DEFAULTS`), so change them there too if you use option C. People you add
in Home settings on the TV get an id from their name ("Blake" becomes `blake`), so the emoji still
match.

## The grown-ups screen

The right PIN (on **More apps** or **Settings**) opens the grown-ups screen instead of the girls'
home: every app on the TV, Keep watching from Android's Watch Next list (the show under focus big
at the top), this week's weather and "locks again in 14:52". Its buttons: **Controls**, **Home
settings** (couch-tv's own), **TV settings** (Android's) and **Lock now**. Back or Home locks it
too. The screen is `tv-home/web/grownups.js`; the design is `design/mockups/Grownups.dc.html`.

**Controls** (the first button): bedtime for school nights, Friday and Saturday and the wake-up
time, in 15 minute steps (left and right); a star for each girl (left takes one, right gives one;
five make a trophy, and confetti falls the next time her home shows); little mode on or off per
girl; and the grown-ups PIN. What is changed here is kept on the TV and wins over `config.json`.

## Little mode (Sora)

With little mode on for whoever is picked, the home is only her apps as huge picture tiles (each
app's own TV banner), a small clock at the top right and nothing else: no shows, no name pill, no
Settings or More apps to land on. Left and right move, OK opens, up and down do nothing. A **long
press on OK** opens the people list, which is how a grown-up switches to Blake or Lucy. Default:
Sora (`little` above).

## Stars, the wind-down and the morning

- **Stars** show under her name on her home (★★★☆☆, then 🏆 and a count). Grown-ups give them from
  Controls. Kept on the TV only.
- **Wind-down:** a small moon at the top right counts down the last 15 minutes before bedtime
  ("Bedtime in 12 min"); at 5 minutes the home dims and says "Nearly bedtime". Extra time counts
  down the same way.
- **Morning:** in the hour before wake-up, the Goodnight screen turns to sunrise colours ("Almost
  morning!"). The first time the home shows after wake-up it says "Good morning, Blake!" over a
  sunrise for five seconds, once a day.

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

## Make the girls' pictures again

Each girl's picture (and the bedtime one) is drawn as an SVG in `tv-home/tools/kid-scenes/`, the
same drawing as in the mockups. After changing one, make the pictures the TV shows:

```sh
node tv-home/tools/render-kid-scenes.js
```

That writes `tv-home/web/backgrounds/kid-<name>.jpg` (it needs Playwright). A girl with no picture
of her own gets Blake's. With the Classic look, or `home.kids.enabled: false`, the scenes below
come back.

## The older kid scenes

Three more drawn scenes, used only when the girls' own look is off. To change their colours, edit
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

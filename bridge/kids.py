"""Kidstv: the kids' settings (home.kids in config.json) and bedtime.

The TV home draws the bedtime screen itself (tv-home/web/kids.js). The bridge adds one thing the
home cannot do: when bedtime starts while a show is on, it presses Home, so the girls land on the
"Goodnight" screen instead of carrying on in Netflix. Extra time a grown-up gives on the TV (with the
PIN) is passed here as extra_until, and Home is pressed again when it runs out.
"""
import re
from datetime import datetime, timedelta

DEFAULT_BEDTIME = {"from": "19:30", "until": "07:00", "weekend_from": "20:00"}


def _hm(v):
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", str(v or ""))
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        return None
    return f"{int(m.group(1)):02d}:{m.group(2)}"


def clean(k):
    """home.kids from config.json, tidied. Anything left out is left out, so the TV uses its defaults."""
    k = k if isinstance(k, dict) else {}
    out = {}
    if isinstance(k.get("enabled"), bool):
        out["enabled"] = k["enabled"]
    if isinstance(k.get("emoji"), dict):
        out["emoji"] = {str(i)[:32]: str(e)[:8] for i, e in k["emoji"].items() if isinstance(e, str) and e.strip()}
    if isinstance(k.get("home_apps"), list):
        out["home_apps"] = [p for p in dict.fromkeys(k["home_apps"])
                            if isinstance(p, str) and re.fullmatch(r"[A-Za-z0-9_.]{1,200}", p)][:10]
    if "pin" in k:
        pin = str(k.get("pin") or "")
        out["pin"] = pin if re.fullmatch(r"\d{4}", pin) else ""
    if k.get("bedtime") is False or k.get("bedtime") is None and "bedtime" in k:
        out["bedtime"] = None
    elif isinstance(k.get("bedtime"), dict):
        b = {key: _hm(k["bedtime"].get(key)) for key in ("from", "until", "weekend_from")}
        if b["from"] and b["until"]:
            out["bedtime"] = {key: v for key, v in b.items() if v}
    if isinstance(k.get("unlock_minutes"), int) and 1 <= k["unlock_minutes"] <= 120:
        out["unlock_minutes"] = k["unlock_minutes"]
    return out


def bedtime_of(kids):
    """The bedtime window as minutes from midnight, or None when bedtime is off."""
    if kids.get("enabled") is False:
        return None
    b = kids["bedtime"] if "bedtime" in kids else DEFAULT_BEDTIME
    if not b:
        return None
    mins = lambda s: int(s[:2]) * 60 + int(s[3:])
    start = mins(b["from"])
    return {"from": start, "until": mins(b["until"]), "weekend": mins(b["weekend_from"]) if b.get("weekend_from") else start}


def is_bedtime(bed, now):
    """The same rule as kids.js: Friday and Saturday nights start at weekend_from."""
    if not bed:
        return False
    t = now.hour * 60 + now.minute
    start = bed["weekend"] if now.weekday() in (4, 5) else bed["from"]
    if start > bed["until"]:
        return t >= start or t < bed["until"]
    return start <= t < bed["until"]


def night_of(bed, now):
    """Which night a bedtime moment belongs to (after midnight still counts as the evening before)."""
    day = now.date()
    if now.hour * 60 + now.minute < bed["until"]:
        day -= timedelta(days=1)
    return day.isoformat()


if __name__ == "__main__":
    b = bedtime_of({})
    for s in ("2026-10-29 19:29", "2026-10-29 19:30", "2026-10-30 19:45", "2026-10-30 20:00", "2026-10-31 06:59", "2026-10-31 07:00"):
        d = datetime.fromisoformat(s)
        print(s, d.strftime("%a"), is_bedtime(b, d), night_of(b, d))

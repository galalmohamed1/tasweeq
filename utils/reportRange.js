// بيحسب بداية ونهاية الفترة بتوقيت القاهرة
// period: daily | weekly (من السبت) | monthly | custom (from/to)
const TZ = "Africa/Cairo";

const tzOffsetMs = (date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return asUTC - date.getTime();
};

// منتصف ليل يوم معين بتوقيت القاهرة (بيقبل overflow في اليوم والشهر)
const cairoStartOfDay = (y, m, d) => {
  const wall = Date.UTC(y, m - 1, d);
  let t = wall - tzOffsetMs(new Date(wall));
  t = wall - tzOffsetMs(new Date(t));
  return new Date(t);
};

const fmt = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date); // YYYY-MM-DD

const parseYMD = (str) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || "");
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1) return null;
  return { y, m: mo, d };
};

// بترجّع { start, end, label } أو { error }
const getRange = ({ period = "daily", date, from, to } = {}) => {
  if (period === "custom") {
    const f = parseYMD(from);
    const t = parseYMD(to);
    if (!f || !t) return { error: "from و to مطلوبين بصيغة YYYY-MM-DD" };
    const start = cairoStartOfDay(f.y, f.m, f.d);
    const end = cairoStartOfDay(t.y, t.m, t.d + 1);
    if (end <= start) return { error: "تاريخ النهاية قبل البداية" };
    return { period, start, end, label: `${from} → ${to}` };
  }

  const base = parseYMD(date || fmt(new Date()));
  if (!base) return { error: "date لازم يكون بصيغة YYYY-MM-DD" };
  const { y, m, d } = base;

  let start;
  let end;

  if (period === "daily") {
    start = cairoStartOfDay(y, m, d);
    end = cairoStartOfDay(y, m, d + 1);
  } else if (period === "weekly") {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 الأحد .. 6 السبت
    const back = (dow + 1) % 7; // الأسبوع بيبدأ السبت
    start = cairoStartOfDay(y, m, d - back);
    end = cairoStartOfDay(y, m, d - back + 7);
  } else if (period === "monthly") {
    start = cairoStartOfDay(y, m, 1);
    end = cairoStartOfDay(y, m + 1, 1);
  } else {
    return { error: "period لازم يكون daily أو weekly أو monthly أو custom" };
  }

  return {
    period,
    start,
    end,
    label: `${fmt(start)} → ${fmt(new Date(end.getTime() - 1))}`,
  };
};

module.exports = { getRange, fmt };
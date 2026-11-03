(function () {
  'use strict';

  var STORE_KEY = 'miaoxin.state.v1';
  var MILESTONES = [0.25, 0.5, 0.75, 1];
  var MILESTONE_TEXT = {
    0.25: '已经赚回今日目标的四分之一，稳稳的。',
    0.5: '一半了。今天的你，已经完成了一半的量。',
    0.75: '只剩四分之一，剩下的时间开始属于你自己。',
    1: '今日工资已全部赚回，剩下的时间属于你自己。'
  };
  var PRESETS = {
    double: { days: '22' },
    bigweek: { days: '24' },
    overtime: { days: '26' }
  };
  var DEFAULT_SCHEDULE = {
    start: '09:00',
    lunchStart: '12:00',
    lunchEnd: '13:30',
    end: '18:30',
    hasLunch: true
  };
  var PEP_BASE = [
    '今天也辛苦你了，先喝口水。',
    '不用每一秒都高效，能坐在这里已经很不容易。',
    '慢慢来，你已经比刚入职的时候熟练太多了。',
    '钱会到账，你也要记得好好吃饭。',
    '撑住今天就好，明天的事交给明天。',
    '你不需要向谁证明自己很能扛。',
    '这一秒你在努力，下一秒好运在路上。',
    '别急，你的节奏就是最好的节奏。',
    '工作只是生活的一部分，不是全部的你。',
    '下班之后的那段时间，才是真正属于你的。',
    '这件事你做得比你以为的要好。',
    '允许自己偶尔状态不好，人不是机器。'
  ];
  var SPEND_ITEMS = [
    { label: '一杯咖啡', price: 25 },
    { label: '一顿午饭', price: 35 },
    { label: '一张电影票', price: 45 },
    { label: '一次按摩', price: 128 },
    { label: '一件喜欢的衣服', price: 299 }
  ];

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }

  var el = {
    setupCard: $('setupCard'),
    form: $('form'),
    salary: $('salaryInput'),
    days: $('daysInput'),
    previewText: $('previewText'),
    fieldSalary: $('field-salary'),
    fieldDays: $('field-days'),
    fieldHours: $('field-hours'),
    errSalary: $('err-salary'),
    errDays: $('err-days'),
    errHours: $('err-hours'),
    editBtn: $('editBtn'),
    sumSalary: $('sumSalary'),
    sumDays: $('sumDays'),
    sumHours: $('sumHours'),
    resultArea: $('resultArea'),
    heroInt: $('heroInt'),
    heroDec: $('heroDec'),
    perMinute: $('perMinute'),
    perHour: $('perHour'),
    perDay: $('perDay'),
    unitFoot: $('unitFoot'),
    earned: $('earned'),
    phaseBadge: $('phaseBadge'),
    earnTime: $('earnTime'),
    earnFoot: $('earnFoot'),
    goalText: $('goalText'),
    goalPct: $('goalPct'),
    goalBar: $('goalBar'),
    goalBarWrap: $('goalBarWrap'),
    goalHint: $('goalHint'),
    liveDot: $('liveDot'),
    startTime: $('startTime'),
    lunchStart: $('lunchStart'),
    lunchEnd: $('lunchEnd'),
    endTime: $('endTime'),
    lunchToggle: $('lunchToggle'),
    effortHoursText: $('effortHoursText'),
    effortHoursNote: $('effortHoursNote'),
    errSchedule: $('err-schedule'),
    scheduleBlock: $('scheduleBlock'),
    sumSchedule: $('sumSchedule'),
    cheerText: $('cheerText'),
    nextCheer: $('nextCheer'),
    tiredBtn: $('tiredBtn'),
    convertList: $('convertList'),
    convertSub: $('convertSub'),
    toast: $('toast'),
    clockDate: $('clockDate'),
    clockTime: $('clockTime'),
    pepBar: $('pepBar'),
    pepText: $('pepText'),
    paydayInput: $('paydayInput'),
    errPayday: $('err-payday'),
    fieldPayday: $('field-payday'),
    sumPayday: $('sumPayday'),
    paydayTarget: $('paydayTarget'),
    paydayNote: $('paydayNote'),
    paydayBadge: $('paydayBadge'),
    cdDay: $('cdDay'),
    cdHour: $('cdHour'),
    cdMin: $('cdMin'),
    cdSec: $('cdSec'),
    cyclePct: $('cyclePct'),
    cycleAmount: $('cycleAmount'),
    cycleBar: $('cycleBar'),
    cycleHint: $('cycleHint')
  };

  var state = {
    values: null,
    calc: null,
    cheerPool: [],
    cheerIndex: 0,
    milestone: 0,
    toastTimer: null
  };

  /* ---------------- 工具 ---------------- */

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function fmt(n, digits) {
    if (!isFinite(n)) return '0';
    return n.toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function parseNumber(raw) {
    if (raw === null || raw === undefined) return NaN;
    var cleaned = String(raw).replace(/[\s,，¥元]/g, '');
    if (!cleaned) return NaN;
    if (!/^\d*(\.\d*)?$/.test(cleaned)) return NaN;
    var n = Number(cleaned);
    return isFinite(n) ? n : NaN;
  }

  // "09:30" -> 570（分钟）；非法返回 NaN
  function parseTime(raw) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(raw || '').trim());
    if (!m) return NaN;
    var h = Number(m[1]);
    var mi = Number(m[2]);
    if (h > 23 || mi > 59) return NaN;
    return h * 60 + mi;
  }

  function formatTime(minutes) {
    if (!isFinite(minutes)) return '—';
    var h = Math.floor(minutes / 60) % 24;
    var m = Math.round(minutes % 60);
    return pad(h) + ':' + pad(m);
  }

  function minutesToText(minutes) {
    if (!isFinite(minutes) || minutes < 0) return '—';
    var whole = Math.floor(minutes);
    var h = Math.floor(whole / 60);
    var m = whole % 60;
    if (h && m) return h + ' 小时 ' + m + ' 分';
    if (h) return h + ' 小时';
    return m + ' 分';
  }

  function sanitizeInput(input, digitsOnly) {
    var raw = input.value;
    var cleaned = digitsOnly ? raw.replace(/\D/g, '') : raw.replace(/[^\d.]/g, '');
    var dot = cleaned.indexOf('.');
    if (dot !== -1) {
      cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
    }
    if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
    if (cleaned !== raw) input.value = cleaned;
  }

  function humanDuration(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return '—';
    if (seconds < 60) return Math.max(1, Math.round(seconds)) + ' 秒';
    if (seconds < 3600) return Math.round(seconds / 60) + ' 分钟';
    var h = seconds / 3600;
    if (h < 10) return (Math.round(h * 10) / 10).toFixed(1) + ' 小时';
    return Math.round(h) + ' 小时';
  }

  /* ---------------- 日期 / 发薪周期 ---------------- */

  var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function formatDateCN(d) {
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() +
      ' 日 ' + WEEKDAYS[d.getDay()];
  }

  function paydayOfMonth(year, month, day) {
    var lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay), 0, 0, 0, 0);
  }

  // 上一个已达成的发薪日 与 下一个发薪日（含「今天就是发薪日」判断）
  function getPaydayInfo(now, day) {
    var thisMonth = paydayOfMonth(now.getFullYear(), now.getMonth(), day);
    var last, next;

    if (now.getTime() >= thisMonth.getTime()) {
      last = thisMonth;
      next = paydayOfMonth(now.getFullYear(), now.getMonth() + 1, day);
    } else {
      last = paydayOfMonth(now.getFullYear(), now.getMonth() - 1, day);
      next = thisMonth;
    }

    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return {
      last: last,
      next: next,
      isPaydayToday: last.getTime() === todayStart
    };
  }

  function updateCalendar() {
    var now = new Date();
    el.clockDate.textContent = formatDateCN(now);
    el.clockTime.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

    if (!state.values) return;

    var info = getPaydayInfo(now, state.values.payday);
    var diff = Math.max(0, info.next.getTime() - now.getTime());
    var totalSec = Math.floor(diff / 1000);
    var d = Math.floor(totalSec / 86400);
    var h = Math.floor((totalSec % 86400) / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;

    el.cdDay.textContent = d < 10 ? '0' + d : String(d);
    el.cdHour.textContent = pad(h);
    el.cdMin.textContent = pad(m);
    el.cdSec.textContent = pad(s);

    el.paydayTarget.textContent = (info.next.getMonth() + 1) + ' 月 ' +
      info.next.getDate() + ' 日 ' + WEEKDAYS[info.next.getDay()];
    el.paydayNote.textContent = info.isPaydayToday
      ? '今天就是发薪日，工资今天到账'
      : '发薪日当天 0 点后到账';

    if (info.isPaydayToday) {
      el.paydayBadge.textContent = '今天到账';
    } else if (d === 0) {
      el.paydayBadge.textContent = '不到 1 天';
    } else {
      el.paydayBadge.textContent = '还有 ' + d + ' 天';
    }
    el.paydayBadge.classList.toggle('is-today', info.isPaydayToday);

    var span = info.next.getTime() - info.last.getTime();
    var ratio = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - info.last.getTime()) / span)) : 1;
    var earned = state.values.salary * ratio;
    var left = Math.max(0, state.values.salary - earned);

    el.cycleBar.style.width = (ratio * 100).toFixed(2) + '%';
    el.cyclePct.textContent = Math.floor(ratio * 100) + '%';
    el.cycleAmount.textContent = '¥' + fmt(earned, 0) + ' / ¥' + fmt(state.values.salary, 0);
    el.cycleHint.textContent = info.isPaydayToday
      ? '工资今天到账。新的一个周期，从今天重新开始。'
      : '按自然日估算，这个发薪周期已经赚到约 ¥' + fmt(earned, 0) +
        '，还剩 ¥' + fmt(left, 0) + ' 在路上。';
  }

  /* ---------------- 计算 ---------------- */

  function computeSalary(values) {
    var monthlySeconds = values.days * values.hours * 3600;
    var perSecond = values.salary / monthlySeconds;
    return {
      perSecond: perSecond,
      perMinute: perSecond * 60,
      perHour: perSecond * 3600,
      perDay: perSecond * 3600 * values.hours,
      monthlySeconds: monthlySeconds
    };
  }

  function readSchedule() {
    return {
      start: parseTime(el.startTime.value),
      lunchStart: parseTime(el.lunchStart.value),
      lunchEnd: parseTime(el.lunchEnd.value),
      end: parseTime(el.endTime.value),
      hasLunch: !!el.lunchToggle.checked
    };
  }

  // 有效工时（小时）：在岗时长减去午休
  function scheduleHours(sch) {
    if (!isFinite(sch.start) || !isFinite(sch.end)) return NaN;
    var span = sch.end - sch.start;
    if (sch.hasLunch) {
      if (!isFinite(sch.lunchStart) || !isFinite(sch.lunchEnd)) return NaN;
      span -= (sch.lunchEnd - sch.lunchStart);
    }
    return span / 60;
  }

  function scheduleErrorMessage(sch) {
    if (!isFinite(sch.start)) return '请填写上班时间';
    if (!isFinite(sch.end)) return '请填写下班时间';
    if (sch.end <= sch.start) return '下班时间需要晚于上班时间';
    if (sch.end - sch.start > 18 * 60) return '上班到下班请控制在 18 小时以内';
    if (sch.hasLunch) {
      if (!isFinite(sch.lunchStart) || !isFinite(sch.lunchEnd)) return '请填写完整的午休时间';
      if (sch.lunchEnd <= sch.lunchStart) return '午休结束需要晚于午休开始';
      if (sch.lunchStart <= sch.start) return '午休开始需要晚于上班时间';
      if (sch.lunchEnd >= sch.end) return '午休结束需要早于下班时间';
    }
    var h = scheduleHours(sch);
    if (!isFinite(h) || h <= 0) return '扣掉午休后没有有效工时';
    if (h > 16) return '每日有效工时请控制在 16 小时以内';
    return '';
  }

  function collect() {
    var salary = parseNumber(el.salary.value);
    var days = parseNumber(el.days.value);
    var payday = parseNumber(el.paydayInput.value);
    var schedule = readSchedule();
    var errors = {};

    if (!isFinite(salary)) errors.salary = '请填写月薪，例如 10000';
    else if (salary <= 0) errors.salary = '月薪需要大于 0';
    else if (salary > 1000000) errors.salary = '月薪请填写 100 万以内';

    if (!isFinite(days)) errors.days = '请填写每月上班天数';
    else if (Math.floor(days) !== days) errors.days = '天数需要是整数';
    else if (days < 1 || days > 31) errors.days = '天数请在 1 - 31 之间';

    var schMsg = scheduleErrorMessage(schedule);
    if (schMsg) errors.schedule = schMsg;

    if (!isFinite(payday)) errors.payday = '请填写发薪日';
    else if (Math.floor(payday) !== payday) errors.payday = '发薪日需要是整数';
    else if (payday < 1 || payday > 31) errors.payday = '发薪日请在 1 - 31 之间';

    var hours = schMsg ? NaN : scheduleHours(schedule);

    if (!errors.days && isFinite(hours) && days * hours < 1) {
      errors.days = '每月总工时太短，请检查一下';
    }

    return {
      values: {
        salary: salary,
        days: days,
        payday: payday,
        start: schedule.start,
        lunchStart: schedule.lunchStart,
        lunchEnd: schedule.lunchEnd,
        end: schedule.end,
        hasLunch: schedule.hasLunch,
        hours: hours
      },
      errors: errors
    };
  }

  /* ---------------- 校验展示 ---------------- */

  function setErrors(errors) {
    var map = [
      { key: 'salary', field: el.fieldSalary, err: el.errSalary },
      { key: 'days', field: el.fieldDays, err: el.errDays },
      { key: 'hours', field: el.fieldHours, err: el.errHours },
      { key: 'schedule', field: el.scheduleBlock, err: el.errSchedule },
      { key: 'payday', field: el.fieldPayday, err: el.errPayday }
    ];
    map.forEach(function (item) {
      var msg = errors[item.key] || '';
      item.err.textContent = msg;
      item.field.classList.toggle('has-error', !!msg);
    });
  }

  function clearError(input) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.remove('has-error');
    var err = field.querySelector('.err');
    if (err) err.textContent = '';
  }

  function syncLunchState() {
    var on = !!el.lunchToggle.checked;
    el.lunchStart.disabled = !on;
    el.lunchEnd.disabled = !on;
    [el.lunchStart, el.lunchEnd].forEach(function (input) {
      var shell = input.closest('.time-shell');
      if (shell) shell.classList.toggle('is-off', !on);
    });
  }

  function updateEffortDisplay() {
    var sch = readSchedule();
    var msg = scheduleErrorMessage(sch);

    if (msg) {
      el.effortHoursText.textContent = '—';
      el.effortHoursNote.textContent = msg;
      return;
    }

    var worked = Math.round(scheduleHours(sch) * 60);
    var span = Math.round(sch.end - sch.start);
    var lunch = sch.hasLunch ? Math.round(sch.lunchEnd - sch.lunchStart) : 0;

    el.effortHoursText.textContent = minutesToText(worked);
    el.effortHoursNote.textContent = lunch > 0
      ? '在岗 ' + minutesToText(span) + '，扣除午休 ' + minutesToText(lunch)
      : '中间没有午休，在岗 ' + minutesToText(span);
  }

  function updatePreview() {
    var salary = parseNumber(el.salary.value);
    var days = parseNumber(el.days.value);
    var sch = readSchedule();
    var schMsg = scheduleErrorMessage(sch);

    updateEffortDisplay();

    var ok = isFinite(salary) && salary > 0 && salary <= 1000000 &&
      isFinite(days) && Math.floor(days) === days && days >= 1 && days <= 31 && !schMsg;

    if (ok) {
      var hours = scheduleHours(sch);
      var c = computeSalary({ salary: salary, days: days, hours: hours });
      el.previewText.innerHTML = '预计每秒 <strong>¥' + c.perSecond.toFixed(4) +
        '</strong> · 每天算 ' + minutesToText(Math.round(hours * 60));
      el.previewText.classList.add('ready');
    } else {
      el.previewText.textContent = '填好月薪、天数与作息，就能看到你每秒的收入';
      el.previewText.classList.remove('ready');
    }
  }

  /* ---------------- 渲染 ---------------- */

  function setHeroValue(v) {
    var str = v.toFixed(4);
    var parts = str.split('.');
    el.heroInt.textContent = parts[0];
    el.heroDec.textContent = '.' + parts[1];
  }

  function animateHero(target) {
    if (reduceMotion) { setHeroValue(target); return; }
    var startTime = performance.now();
    var duration = 900;
    function frame(now) {
      var p = Math.min(1, (now - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      setHeroValue(target * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderSummary() {
    var v = state.values;
    el.sumSalary.textContent = '¥' + fmt(v.salary, 0);
    el.sumDays.textContent = v.days + ' 天';
    el.sumHours.textContent = minutesToText(Math.round(v.hours * 60));
    el.sumSchedule.textContent = formatTime(v.start) + ' - ' + formatTime(v.end);
    el.sumPayday.textContent = '每月 ' + v.payday + ' 号';
  }

  function renderStats() {
    var c = state.calc;
    el.perMinute.textContent = '¥' + fmt(c.perMinute, 2);
    el.perHour.textContent = '¥' + fmt(c.perHour, 2);
    el.perDay.textContent = '¥' + fmt(c.perDay, 2);
    el.unitFoot.textContent = '赚到 1 元，大约需要 ' + humanDuration(1 / c.perSecond);
  }

  function renderConvert() {
    var c = state.calc;
    el.convertSub.textContent = '按你每秒的收入，这些东西值得你工作多久';
    el.convertList.innerHTML = SPEND_ITEMS.map(function (item) {
      var seconds = item.price / c.perSecond;
      return '<li>' +
        '<span class="c-label">' + item.label + '</span>' +
        '<span class="c-price">¥' + item.price + '</span>' +
        '<span class="c-time">≈ ' + humanDuration(seconds) + '</span>' +
        '</li>';
    }).join('');
  }

  function revealResults() {
    if (!el.resultArea.hidden) return;
    el.resultArea.hidden = false;
    Array.prototype.forEach.call(el.resultArea.children, function (node, i) {
      node.style.animationDelay = (i * 80) + 'ms';
      node.classList.add('enter');
    });
  }

  /* ---------------- 激励内容 ---------------- */

  function buildCheers(calc, values) {
    var p4 = calc.perSecond.toFixed(4);
    var hourly = calc.perHour;
    var breath = (calc.perSecond * 4).toFixed(4);
    var minuteCost = (calc.perSecond * 60).toFixed(2);
    var out = [];

    out.push('你现在的每一秒值 ¥' + p4 + '。这不是励志口号，是一笔能算清楚的账。');
    out.push('深呼吸一次大约 4 秒，刚刚你已经赚到了 ¥' + breath + '。');
    out.push('按这个速度，摸鱼一分钟只“损失” ¥' + minuteCost + '。真的，可以喘口气。');
    out.push('一天下来是 ¥' + fmt(calc.perDay, 0) + '。这个数字，是你每天准时出现的证明。');

    if (hourly < 25) {
      out.push('时薪 ¥' + fmt(hourly, 1) + ' 不算高，但每一个按时到岗的早晨都算数。');
      out.push('这份工资也许还没配得上你。把它当过渡，别当结论。');
    } else if (hourly < 60) {
      out.push('时薪 ¥' + fmt(hourly, 1) + '，稳稳当当。你在用自己的节奏把日子往前推。');
      out.push('不用和谁比，你的账本只记录你自己的努力。');
    } else if (hourly < 110) {
      out.push('时薪 ¥' + fmt(hourly, 1) + '，说明你已经能稳稳接住不少事了。');
      out.push('你的时间已经被标上 ¥' + fmt(hourly, 1) + ' / 小时，记得也花在值得的地方。');
    } else {
      out.push('时薪 ¥' + fmt(hourly, 1) + '，你的时间很贵。少浪费在无效的会议和消耗你的人身上。');
      out.push('时薪 ¥' + fmt(hourly, 1) + '，你已经有底气挑选：把时间给谁，不给谁。');
    }

    out.push('一个月 ' + values.days + ' 天、每天 ' + formatTime(values.start) + ' 到 ' +
      formatTime(values.end) + '，真正算钱的只有 ' + minutesToText(Math.round(values.hours * 60)) +
      '。剩下的时间，也记得留一点给自己。');

    var now = new Date();
    var info = getPaydayInfo(now, values.payday);
    var daysLeft = Math.ceil((info.next.getTime() - now.getTime()) / 86400000);
    out.push('距离 ' + (info.next.getMonth() + 1) + ' 月 ' + info.next.getDate() +
      ' 日发薪还有 ' + Math.max(0, daysLeft) + ' 天。数字在长，你也在。');
    out.push('今天是 ' + formatDateCN(now) + '。很普通的一天，你也在认真地过。');

    out.push('今天的你，已经撑过了很多个「再坚持一下」。这一次也一样。');
    return out;
  }

  function buildTired(calc) {
    var p4 = calc.perSecond.toFixed(4);
    var minuteCost = (calc.perSecond * 60).toFixed(2);
    return [
      '累是真的，不是你矫情。先放下手里的事，喝口水——这一秒你也赚到了 ¥' + p4 + '。',
      '如果今天只想完成最低限度的事，那也完全可以。',
      '这个数字算的是收入，不是你的价值。别用工资给自己打分。',
      '撑不住的时候可以慢一点。身体不会等你有空才休息。',
      '允许自己发呆 60 秒，成本只有 ¥' + minuteCost + '。发完呆再回来。',
      '你不是机器，就算是机器，也需要停机维护。'
    ];
  }

  function showCheer(text) {
    el.cheerText.textContent = text;
    el.cheerText.classList.remove('swap');
    void el.cheerText.offsetWidth;
    el.cheerText.classList.add('swap');
  }

  function nextCheer() {
    if (!state.cheerPool.length) return;
    state.cheerIndex = (state.cheerIndex + 1) % state.cheerPool.length;
    showCheer(state.cheerPool[state.cheerIndex]);
  }

  function tiredCheer() {
    if (!state.calc) return;
    var pool = buildTired(state.calc);
    var pick = pool[Math.floor(Math.random() * pool.length)];
    showCheer(pick);
  }

  /* ---------------- 顶部轮换鼓励语 ---------------- */

  var pepIndex = 0;
  var pepTimer = null;
  var pepPaused = false;

  function buildPepPool() {
    var pool = PEP_BASE.slice();
    var calc = state.calc;
    if (!calc || !state.values) return pool;

    pool.push(function () {
      return '按你每秒的收入，一杯 25 元的咖啡，只要 ' + humanDuration(25 / calc.perSecond) + '。';
    });

    pool.push(function () {
      var today = computeToday(new Date());
      if (today && today.phase !== 'before') {
        return '今天到现在，你已经赚了 ¥' + fmt(today.earned, 2) + '。';
      }
      return '今天的目标是 ¥' + fmt(calc.perDay, 0) + '，等你开工。';
    });

    pool.push(function () {
      var info = getPaydayInfo(new Date(), state.values.payday);
      var daysLeft = Math.max(0, Math.ceil((info.next.getTime() - Date.now()) / 86400000));
      return daysLeft > 0
        ? '距离 ' + (info.next.getMonth() + 1) + ' 月 ' + info.next.getDate() +
          ' 日发薪还有 ' + daysLeft + ' 天。'
        : '今天就是发薪日，钱已经在路上了。';
    });

    return pool;
  }

  function showPep(text) {
    el.pepText.textContent = text;
    el.pepText.classList.remove('swap');
    void el.pepText.offsetWidth;
    el.pepText.classList.add('swap');
  }

  function rotatePep() {
    if (pepPaused) return;
    var pool = buildPepPool();
    pepIndex = (pepIndex + 1) % pool.length;
    var item = pool[pepIndex];
    showPep(typeof item === 'function' ? item() : item);
  }

  function startPepRotation() {
    clearInterval(pepTimer);
    pepTimer = setInterval(rotatePep, 7000);
  }

  /* ---------------- 今日实时结算 ---------------- */

  var PHASE_TEXT = {
    before: '未上班',
    work: '工作中',
    lunch: '午休中',
    after: '已下班'
  };

  function computeToday(now) {
    var v = state.values;
    var c = state.calc;
    if (!v || !c) return null;

    var nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 +
      now.getMilliseconds() / 60000;
    var lunchStart = v.hasLunch ? v.lunchStart : v.start;
    var lunchEnd = v.hasLunch ? v.lunchEnd : v.start;
    var total = scheduleHours(v) * 60;
    var worked;
    var phase;

    if (nowMin < v.start) {
      worked = 0;
      phase = 'before';
    } else if (nowMin >= v.end) {
      worked = total;
      phase = 'after';
    } else {
      worked = nowMin - v.start;
      if (v.hasLunch) {
        worked -= Math.max(0, Math.min(nowMin, lunchEnd) - lunchStart);
      }
      worked = Math.max(0, Math.min(total, worked));
      phase = (v.hasLunch && nowMin >= lunchStart && nowMin < lunchEnd) ? 'lunch' : 'work';
    }

    return {
      phase: phase,
      workedMin: worked,
      totalMin: total,
      earned: (worked / 60) * c.perHour,
      ratio: total > 0 ? Math.min(1, worked / total) : 0,
      toStartMin: Math.max(0, v.start - nowMin),
      toEndMin: Math.max(0, v.end - nowMin),
      toLunchEndMin: Math.max(0, lunchEnd - nowMin),
      isWeekend: now.getDay() === 0 || now.getDay() === 6
    };
  }

  function milestoneOf(ratio) {
    var reached = 0;
    MILESTONES.forEach(function (t) { if (ratio >= t) reached = t; });
    return reached;
  }

  function syncMilestone(ratio) {
    state.milestone = milestoneOf(ratio);
  }

  function tick() {
    if (!state.calc) return;
    var info = computeToday(new Date());
    if (!info) return;
    var v = state.values;

    el.earned.textContent = fmt(info.earned, 4);
    el.phaseBadge.textContent = PHASE_TEXT[info.phase];
    el.phaseBadge.dataset.phase = info.phase;
    el.liveDot.classList.toggle('on', info.phase === 'work');

    el.goalBar.style.width = (info.ratio * 100).toFixed(2) + '%';
    el.goalPct.textContent = Math.floor(info.ratio * 100) + '%';
    el.goalText.textContent = '¥' + fmt(info.earned, 2) + ' / ¥' + fmt(state.calc.perDay, 2);
    el.goalBarWrap.setAttribute('aria-valuenow', String(Math.floor(info.ratio * 100)));

    if (info.phase === 'before') {
      el.earnTime.textContent = '还没到 ' + formatTime(v.start) + '，距上班 ' +
        minutesToText(Math.ceil(info.toStartMin));
    } else if (info.phase === 'work') {
      el.earnTime.textContent = '已工作 ' + minutesToText(Math.round(info.workedMin)) +
        ' · 距下班 ' + minutesToText(Math.ceil(info.toEndMin));
    } else if (info.phase === 'lunch') {
      el.earnTime.textContent = '午休中 · ' + minutesToText(Math.ceil(info.toLunchEndMin)) + '后继续';
    } else {
      el.earnTime.textContent = '今天 ' + minutesToText(Math.round(info.totalMin)) + ' 已全部到账';
    }

    var hint;
    if (info.phase === 'before') {
      hint = '上班前的时间是你自己的，不用拿来算钱。';
    } else if (info.phase === 'lunch') {
      hint = '午休不计工时，这段休息是白赚的。';
    } else if (info.phase === 'after') {
      hint = '今天的工资已经赚完，剩下的时间属于你自己。';
    } else {
      hint = '按这个速度，还差 ¥' + fmt(Math.max(0, state.calc.perDay - info.earned), 2) +
        ' 就赚回今天了。';
    }
    if (info.isWeekend) {
      hint += '（今天是周末，如果是休息日，这个数字仅供参考）';
    }
    el.goalHint.textContent = hint;

    var reached = milestoneOf(info.ratio);
    if (reached > state.milestone) {
      state.milestone = reached;
      toast(MILESTONE_TEXT[reached]);
    }
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, 3400);
  }

  /* ---------------- 主流程 ---------------- */

  function apply(values, options) {
    var opts = options || {};
    var calc = computeSalary(values);

    state.values = values;
    state.calc = calc;

    el.salary.value = String(values.salary);
    el.days.value = String(values.days);
    el.paydayInput.value = String(values.payday);
    el.startTime.value = formatTime(values.start);
    el.lunchStart.value = formatTime(values.lunchStart);
    el.lunchEnd.value = formatTime(values.lunchEnd);
    el.endTime.value = formatTime(values.end);
    el.lunchToggle.checked = !!values.hasLunch;
    syncLunchState();
    updateEffortDisplay();

    el.setupCard.dataset.mode = 'view';
    renderSummary();
    revealResults();

    if (opts.animate === false || reduceMotion) setHeroValue(calc.perSecond);
    else animateHero(calc.perSecond);

    renderStats();
    renderConvert();

    state.cheerPool = buildCheers(calc, values);
    state.cheerIndex = 0;
    showCheer(state.cheerPool[0]);

    el.earnFoot.textContent = '按 ' + formatTime(values.start) + ' 上班、' +
      formatTime(values.end) + ' 下班计算' +
      (values.hasLunch
        ? '，午休 ' + formatTime(values.lunchStart) + ' - ' + formatTime(values.lunchEnd) + ' 不计入工时'
        : '，中间没有午休');

    var todayInfo = computeToday(new Date());
    syncMilestone(todayInfo ? todayInfo.ratio : 0);
    tick();
    updateCalendar();

    pepIndex = PEP_BASE.length - 1;
    rotatePep();

    save();
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ values: state.values }));
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /* ---------------- 事件绑定 ---------------- */

  function bindEvents() {
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var res = collect();
      setErrors(res.errors);
      if (Object.keys(res.errors).length) {
        if (res.errors.schedule) {
          el.startTime.focus();
        } else {
          var first = document.querySelector('.field.has-error input');
          if (first) first.focus();
        }
        return;
      }
      apply(res.values);
    });

    [el.salary, el.days].forEach(function (input) {
      input.addEventListener('input', function () {
        sanitizeInput(input);
        clearError(input);
        updatePreview();
      });
    });

    el.paydayInput.addEventListener('input', function () {
      sanitizeInput(el.paydayInput, true);
      clearError(el.paydayInput);
    });

    [el.startTime, el.lunchStart, el.lunchEnd, el.endTime].forEach(function (input) {
      input.addEventListener('input', function () {
        el.scheduleBlock.classList.remove('has-error');
        el.errSchedule.textContent = '';
        updatePreview();
      });
      input.addEventListener('change', updatePreview);
    });

    el.lunchToggle.addEventListener('change', function () {
      syncLunchState();
      el.scheduleBlock.classList.remove('has-error');
      el.errSchedule.textContent = '';
      updatePreview();
    });

    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (btn) {
      btn.addEventListener('click', function () {
        var preset = PRESETS[btn.dataset.preset];
        if (!preset) return;
        el.days.value = preset.days;
        clearError(el.days);
        updatePreview();
        if (!el.salary.value) el.salary.focus();
      });
    });

    el.editBtn.addEventListener('click', function () {
      el.setupCard.dataset.mode = 'edit';
      el.salary.focus();
      el.salary.select();
    });

    el.nextCheer.addEventListener('click', nextCheer);
    el.tiredBtn.addEventListener('click', tiredCheer);

    el.pepBar.addEventListener('mouseenter', function () { pepPaused = true; });
    el.pepBar.addEventListener('mouseleave', function () { pepPaused = false; });
  }

  var lastPaint = 0;
  var lastCalendar = 0;

  function loop(now) {
    if (now - lastCalendar > 250) {
      lastCalendar = now;
      updateCalendar();
    }
    if (state.calc && now - lastPaint > 80) {
      lastPaint = now;
      tick();
    }
    requestAnimationFrame(loop);
  }

  function init() {
    bindEvents();
    syncLunchState();
    updatePreview();
    updateCalendar();
    showPep(PEP_BASE[0]);
    startPepRotation();

    var saved = load();
    if (saved && saved.values) {
      var v = saved.values;
      if (!isFinite(v.payday) || v.payday < 1 || v.payday > 31) v.payday = 12;

      // 兼容旧数据：只有 hours、没有作息的版本
      if (!isFinite(v.start) || !isFinite(v.end)) {
        v.start = parseTime(DEFAULT_SCHEDULE.start);
        v.end = parseTime(DEFAULT_SCHEDULE.end);
        v.lunchStart = parseTime(DEFAULT_SCHEDULE.lunchStart);
        v.lunchEnd = parseTime(DEFAULT_SCHEDULE.lunchEnd);
        v.hasLunch = true;
      }
      if (typeof v.hasLunch !== 'boolean') v.hasLunch = true;

      var schMsg = scheduleErrorMessage(v);
      var valid = isFinite(v.salary) && v.salary > 0 &&
        isFinite(v.days) && v.days >= 1 && v.days <= 31 && !schMsg;

      if (valid) {
        v.hours = scheduleHours(v);
        apply(v, { animate: false });
      }
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

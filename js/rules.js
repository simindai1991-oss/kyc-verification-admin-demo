// 纯业务规则：人工/自动判定、手机号归一、WAT 日期、自动通过时间、筛选与排序
import {
    AUTO_PASS_MINUTES,
    MANUAL_FALLBACK_MINUTES,
    AUTO_WINDOW_UTC,
    WAT_OFFSET_HOURS
} from './config.js';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const WAT_MS = WAT_OFFSET_HOURS * 60 * MIN;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

// 钱包侧审核没写 billdate 的工单才需要人工
export const reviewTypeOf = (t) => (t.billDate ? 'AUTO' : 'MANUAL');

// 支持 08012345678 / 8012345678 / 2348012345678 / +234 801 234 5678，统一成 10 位
export function normalizePhone(input) {
    const raw = String(input || '').trim();
    if (!raw) return { ok: true, value: '' };
    let d = raw.replace(/\D/g, '');
    if (d.length === 13 && d.startsWith('234')) d = d.slice(3);
    else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length !== 10) return { ok: false, value: '' };
    return { ok: true, value: d };
}

export const phoneKey = (full) => String(full).replace(/\D/g, '').slice(-10);

// +2348167123445 → +2348167****45，与线上脱敏一致
export const maskPhone = (full) => `${full.slice(0, 8)}****${full.slice(-2)}`;

function watParts(ms) {
    const d = new Date(ms + WAT_MS);
    return {
        y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(),
        h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds()
    };
}

export function formatWat(input) {
    const ms = typeof input === 'number' ? input : Date.parse(input);
    const p = watParts(ms);
    return `${MONTHS[p.m]} ${pad(p.d)},${p.y} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
}

export function formatUtc(ms) {
    const d = new Date(ms);
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function watYmd(ms) {
    const p = watParts(ms);
    return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

export function addDaysYmd(ymd, n) {
    const [y, m, d] = ymd.split('-').map(Number);
    const x = new Date(Date.UTC(y, m - 1, d) + n * DAY);
    return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

// WAT 某天 00:00:00 对应的时间戳
export function watDayStartMs(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d) - WAT_MS;
}

export function defaultRange(nowMs, days) {
    const today = watYmd(nowMs);
    return [addDaysYmd(today, -(days - 1)), today];
}

function hmsMs(s) {
    const [h, m, sec] = s.split(':').map(Number);
    return ((h * 60 + m) * 60 + sec) * 1000;
}
const WIN_START = hmsMs(AUTO_WINDOW_UTC.start);
const WIN_END = hmsMs(AUTO_WINDOW_UTC.end);

export function inAutoWindow(ms) {
    const tod = ms - Math.floor(ms / DAY) * DAY;
    return tod >= WIN_START && tod <= WIN_END;
}

// 时间窗外到期的自动单，顺延到下一个窗口开始时通过
function nextWindowMoment(ms) {
    const dayStart = Math.floor(ms / DAY) * DAY;
    const tod = ms - dayStart;
    if (tod < WIN_START) return dayStart + WIN_START;
    if (tod <= WIN_END) return ms;
    return dayStart + DAY + WIN_START;
}

export const autoPassAt = (t) => nextWindowMoment(Date.parse(t.createdAt) + AUTO_PASS_MINUTES * MIN);
export const fallbackPassAt = (t) => Date.parse(t.createdAt) + MANUAL_FALLBACK_MINUTES * MIN;

// 推进时钟后结算：自动单到点通过，人工单 48h 兜底通过（claimed 未处理同样兜底）
export function settle(tickets, nowMs) {
    const events = [];
    for (const t of tickets) {
        if (t.status !== 'available' && t.status !== 'claimed') continue;
        const type = reviewTypeOf(t);
        const at = type === 'AUTO' ? autoPassAt(t) : fallbackPassAt(t);
        if (at > nowMs) continue;
        t.status = 'pass';
        t.reviewedAt = new Date(at).toISOString();
        t.reviewedBy = type === 'AUTO' ? 'System · auto review' : 'System · 48h fallback';
        events.push(`${t.name} → pass (${type === 'AUTO' ? 'auto review' : '48h fallback'})`);
    }
    return events;
}

export function filterTickets(tickets, f, { mineOnly, operator }) {
    const [s, e] = f.range || [];
    const from = s ? watDayStartMs(s) : -Infinity;
    const to = e ? watDayStartMs(addDaysYmd(e, 1)) : Infinity;
    const userId = (f.userId || '').trim();
    const ref = (f.referenceCode || '').trim();
    return tickets
        .filter((t) => {
            if (mineOnly && t.claimedBy !== operator) return false;
            if (!mineOnly && f.reviewType === 'MANUAL' && reviewTypeOf(t) !== 'MANUAL') return false;
            if (f.status && f.status.length && !f.status.includes(t.status)) return false;
            const c = Date.parse(t.createdAt);
            if (c < from || c >= to) return false;
            if (userId && t.userId !== userId) return false;
            if (ref && t.referenceCode !== ref) return false;
            if (f.phone && phoneKey(t.phone) !== f.phone) return false;
            return true;
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// Claim 100：只领需人工、available 的单，由远及近
export function pickBatch(tickets, limit) {
    return tickets
        .filter((t) => t.status === 'available' && reviewTypeOf(t) === 'MANUAL')
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        .slice(0, limit);
}

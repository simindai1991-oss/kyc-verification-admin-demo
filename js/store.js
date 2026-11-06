// 演示数据：localStorage 持久化，带一个可推进的演示时钟
import { STORAGE_KEY, OPERATOR, CLAIM_BATCH } from './config.js';
import { buildSeed, makeTicket } from './mockData.js';
import { settle, pickBatch } from './rules.js';

const { reactive } = Vue;

export const store = reactive({
    now: Date.now(),
    tickets: [],
    events: []
});

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        now: store.now, tickets: store.tickets, events: store.events
    }));
}

function log(msg) {
    store.events.unshift({ at: store.now, msg });
    store.events.splice(8);
}

export function resetDemo() {
    store.now = Date.now();
    store.tickets = buildSeed(store.now);
    store.events = [];
    persist();
}

export function loadDemo() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            store.now = saved.now;
            store.tickets = saved.tickets;
            store.events = saved.events || [];
            return;
        }
    } catch (e) { /* 数据损坏时重建 */ }
    resetDemo();
}

export function advanceClock(minutes) {
    store.now += minutes * 60 * 1000;
    const events = settle(store.tickets, store.now);
    log(events.length ? `+${minutes}m: ${events.length} ticket(s) passed by system` : `+${minutes}m: no change`);
    persist();
    return events;
}

export function addTicket(type) {
    const t = makeTicket({ nowMs: store.now, type, index: store.tickets.length });
    store.tickets.push(t);
    log(`New ${type === 'AUTO' ? 'auto' : 'manual'} ticket: ${t.name}`);
    persist();
}

export function claimOne(id) {
    const t = store.tickets.find((x) => x.id === id);
    if (!t || t.status !== 'available') return false;
    t.status = 'claimed';
    t.claimedBy = OPERATOR;
    log(`Claimed ${t.name}`);
    persist();
    return true;
}

export function claimBatch() {
    const picked = pickBatch(store.tickets, CLAIM_BATCH);
    picked.forEach((t) => {
        t.status = 'claimed';
        t.claimedBy = OPERATOR;
    });
    if (picked.length) log(`Claim 100: ${picked.length} manual ticket(s)`);
    persist();
    return picked.length;
}

export function unclaim(id) {
    const t = store.tickets.find((x) => x.id === id);
    if (!t || t.status !== 'claimed' || t.claimedBy !== OPERATOR) return false;
    t.status = 'available';
    t.claimedBy = null;
    log(`Unclaimed ${t.name}`);
    persist();
    return true;
}

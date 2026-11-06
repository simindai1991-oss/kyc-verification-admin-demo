import { store } from '../store.js';
import { OPERATOR } from '../config.js';
import { reviewTypeOf } from '../rules.js';

const { computed } = Vue;

export default {
    template: `
    <div class="topbar">
        <h1 class="text-[22px] font-medium text-[#1f1d3a] mr-8">KYC Verification</h1>
        <div class="flex items-center gap-6 text-[12px]">
            <span class="stat"><i class="dot bg-[#1DCF9F]"></i><b>{{ counts.available }}</b> available</span>
            <span class="stat stat-manual" title="Available tickets that need manual review">
                <i class="dot bg-[#f59a23]"></i><b>{{ counts.manual }}</b> need manual review
            </span>
            <span class="stat"><i class="dot bg-[#f5c400]"></i><b>{{ counts.claimed }}</b> claimed</span>
            <span class="stat"><b>{{ counts.pass }}</b> pass</span>
            <span class="stat"><b>{{ counts.rejected }}</b> rejected</span>
        </div>
        <div class="ml-auto flex items-center gap-3 text-[13px] text-gray-500">
            Hello, <span class="font-semibold text-[#1f1d3a]">{{ operator }}</span>
            <span class="avatar">si</span>
            <i class="fa-solid fa-chevron-down text-[10px] text-opay"></i>
        </div>
    </div>
    `,
    setup() {
        const counts = computed(() => {
            const c = { available: 0, manual: 0, claimed: 0, pass: 0, rejected: 0 };
            store.tickets.forEach((t) => {
                c[t.status] += 1;
                if (t.status === 'available' && reviewTypeOf(t) === 'MANUAL') c.manual += 1;
            });
            return c;
        });
        return { counts, operator: OPERATOR };
    }
};

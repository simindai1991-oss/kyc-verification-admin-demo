// Customer List（mode=all）与 My Customer List（mode=mine）共用一个列表
import { store, claimOne, claimBatch, unclaim } from '../store.js';
import {
    reviewTypeOf, normalizePhone, maskPhone, formatWat,
    watYmd, defaultRange, filterTickets, addDaysYmd
} from '../rules.js';
import { OPERATOR, DEFAULT_RANGE_DAYS, STATUS_OPTIONS, PAGE_SIZE } from '../config.js';

const { ref, reactive, computed, watch } = Vue;

const STATUS_ICON = {
    available: 'fa-regular fa-circle-check text-[#9aa3ad]',
    claimed: 'fa-regular fa-clock text-[#f5a623]',
    pass: 'fa-solid fa-circle-check text-[#1DCF9F]',
    rejected: 'fa-solid fa-circle-xmark text-[#ef4b4b]'
};

const toLocalDate = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const localYmd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default {
    props: { mode: { type: String, default: 'all' } },
    template: `
    <div class="fade-in">
        <div class="toolbar">
            <template v-if="isAll">
                <label class="lbl">Review Type:</label>
                <el-radio-group v-model="reviewType" size="small" @change="page = 1">
                    <el-radio-button value="MANUAL">Manual Review</el-radio-button>
                    <el-radio-button value="ALL">All</el-radio-button>
                </el-radio-group>
            </template>

            <label class="lbl">Status:</label>
            <el-select v-model="draft.status" multiple collapse-tags placeholder="Please select" size="small" style="width: 170px">
                <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s"></el-option>
            </el-select>

            <label class="lbl">Date:</label>
            <div class="w-[230px] shrink-0">
                <el-date-picker v-model="draft.range" type="daterange" size="small" range-separator="-"
                    start-placeholder="Start" end-placeholder="End" format="DD/MM/YY" value-format="YYYY-MM-DD"
                    :disabled-date="disabledDate" :shortcuts="shortcuts">
                </el-date-picker>
            </div>

            <label class="lbl">Phone:</label>
            <el-input v-model="draft.phone" size="small" placeholder="e.g. 08012345678" clearable
                style="width: 150px" :class="{ 'is-error': phoneError }" @keyup.enter="search"></el-input>

            <label class="lbl">User ID:</label>
            <el-input v-model="draft.userId" size="small" clearable style="width: 170px" @keyup.enter="search"></el-input>

            <label class="lbl">Reference Code:</label>
            <el-input v-model="draft.referenceCode" size="small" clearable style="width: 140px" @keyup.enter="search"></el-input>

            <button class="btn-primary" @click="search">search</button>
            <button class="btn-ghost" @click="resetFilters">reset</button>
            <button v-if="isAll" class="btn-primary" @click="onClaimBatch">Claim 100</button>
        </div>
        <div v-if="phoneError" class="px-6 -mt-2 mb-2 text-[12px] text-[#ef4b4b]">
            Please enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.
        </div>

        <div class="table-card">
            <table class="kyc-table">
                <thead>
                    <tr>
                        <th>Date (WAT)</th><th>userId</th><th>Name</th><th>Phone</th><th>KYC</th>
                        <th>Status</th><th>KycCompliance</th><th>Operate</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="t in pageRows" :key="t.id">
                        <td>{{ formatWat(t.createdAt) }}</td>
                        <td class="font-mono text-[12px]">{{ t.userId }}</td>
                        <td>{{ t.name }}</td>
                        <td>{{ maskPhone(t.phone) }}</td>
                        <td>{{ t.kyc }}</td>
                        <td>
                            <i :class="statusIcon[t.status]" class="mr-1.5"></i><span>{{ t.status }}</span>
                            <div v-if="t.reviewedBy" class="sub">{{ t.reviewedBy }}</div>
                        </td>
                        <td>{{ t.kycCompliance }}</td>
                        <td>
                            <template v-if="isAll">
                                <button v-if="t.status === 'available' && typeOf(t) === 'MANUAL'" class="btn-grey" @click="onClaim(t)">Claim</button>
                                <span v-else-if="t.status === 'claimed' && t.claimedBy === operator" class="sub text-opay">Claimed by me</span>
                                <span v-else-if="t.status === 'claimed'" class="sub">{{ t.claimedBy }}</span>
                            </template>
                            <button v-else-if="t.status === 'claimed'" class="btn-grey" @click="onUnclaim(t)">unclaim</button>
                        </td>
                    </tr>
                    <tr v-if="!rows.length">
                        <td colspan="8" class="empty">
                            <i class="fa-regular fa-folder-open text-2xl mb-2 block text-gray-300"></i>
                            {{ emptyText }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="flex justify-center items-center gap-4 py-5">
            <el-pagination background layout="prev, pager, next" :page-size="pageSize"
                :total="rows.length" v-model:current-page="page" hide-on-single-page></el-pagination>
            <span class="text-[12px] text-gray-400">{{ rows.length }} records</span>
        </div>
    </div>
    `,
    setup(props) {
        const isAll = props.mode === 'all';
        const today = computed(() => watYmd(store.now));

        const makeDraft = () => ({
            status: isAll ? ['available'] : ['claimed'],
            range: defaultRange(store.now, DEFAULT_RANGE_DAYS),
            phone: '',
            userId: '',
            referenceCode: ''
        });

        const reviewType = ref('MANUAL');
        const draft = reactive(makeDraft());
        const applied = ref({ ...makeDraft(), phone: '' });
        const phoneError = ref(false);
        const page = ref(1);

        const search = () => {
            const p = normalizePhone(draft.phone);
            phoneError.value = !p.ok;
            if (!p.ok) return;
            applied.value = {
                status: [...draft.status],
                range: draft.range ? [...draft.range] : null,
                phone: p.value,
                userId: draft.userId,
                referenceCode: draft.referenceCode
            };
            page.value = 1;
        };

        const resetFilters = () => {
            Object.assign(draft, makeDraft());
            reviewType.value = 'MANUAL';
            search();
        };

        // ?review=all 打开 All 视图，?phone=xxx 预填手机号并检索
        const params = new URLSearchParams(location.search);
        if (isAll && params.get('review') === 'all') reviewType.value = 'ALL';
        if (isAll && params.get('phone')) {
            draft.phone = params.get('phone');
            search();
        }

        // 演示时钟跨天时，结束日期停在「今天」的区间跟着滚动
        watch(today, (next, prev) => {
            const roll = (r) => (r && r[1] === prev ? defaultRange(store.now, DEFAULT_RANGE_DAYS) : r);
            draft.range = roll(draft.range);
            applied.value = { ...applied.value, range: roll(applied.value.range) };
        });

        const rows = computed(() => filterTickets(
            store.tickets,
            { ...applied.value, reviewType: isAll ? reviewType.value : 'ALL' },
            { mineOnly: !isAll, operator: OPERATOR }
        ));

        const pageRows = computed(() => rows.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

        const emptyText = computed(() => {
            if (!isAll) return 'You have no claimed tickets.';
            return reviewType.value === 'MANUAL' ? 'No tickets need manual review.' : 'No records found.';
        });

        const disabledDate = (d) => localYmd(d) > today.value;

        const shortcuts = [
            { text: 'Today', value: () => [toLocalDate(today.value), toLocalDate(today.value)] },
            { text: 'Last 7 days', value: () => [toLocalDate(addDaysYmd(today.value, -6)), toLocalDate(today.value)] },
            { text: 'Last 30 days', value: () => [toLocalDate(addDaysYmd(today.value, -29)), toLocalDate(today.value)] }
        ];

        const msg = window.ElementPlus.ElMessage;
        const onClaim = (t) => {
            if (claimOne(t.id)) msg.success('Claimed. You can review it in My Customer List.');
        };
        const onClaimBatch = () => {
            const n = claimBatch();
            if (n) msg.success(`Claimed ${n} manual review ticket(s).`);
            else msg.warning('No manual review tickets available to claim.');
        };
        const onUnclaim = (t) => {
            if (unclaim(t.id)) msg.success('Unclaimed.');
        };

        return {
            isAll, reviewType, draft, phoneError, page, pageSize: PAGE_SIZE,
            rows, pageRows, emptyText, search, resetFilters, disabledDate, shortcuts,
            statusOptions: STATUS_OPTIONS, statusIcon: STATUS_ICON, operator: OPERATOR,
            typeOf: reviewTypeOf, maskPhone, formatWat,
            onClaim, onClaimBatch, onUnclaim
        };
    }
};

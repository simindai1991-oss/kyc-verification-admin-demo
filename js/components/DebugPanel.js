import { store, advanceClock, addTicket, resetDemo } from '../store.js';
import { formatWat, formatUtc, inAutoWindow } from '../rules.js';
import { AUTO_WINDOW_UTC } from '../config.js';

const { ref, computed } = Vue;

export default {
    template: `
    <div v-if="visible" class="debug-panel" :class="{ collapsed }">
        <div class="flex justify-between items-center" :class="{ 'mb-3': !collapsed }">
            <div class="font-bold text-green-400"><i class="fa-solid fa-bug mr-1"></i>Demo Console</div>
            <button @click="collapsed = !collapsed" class="text-gray-400 hover:text-white text-xs">
                <i :class="collapsed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
        </div>
        <template v-if="!collapsed">
            <div class="text-gray-300 font-mono text-center bg-black/30 py-2 rounded border border-gray-700">
                <div>{{ watTime }} <span class="text-gray-500">WAT</span></div>
                <div class="text-[10px] text-gray-500 mt-0.5">UTC {{ utcTime }} ·
                    <span :class="inWindow ? 'text-green-400' : 'text-yellow-400'">
                        auto review {{ inWindow ? 'running' : 'paused' }}
                    </span>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-3">
                <button @click="advance(30)" class="dbtn">+30 min</button>
                <button @click="advance(120)" class="dbtn">+2 h</button>
                <button @click="advance(1440)" class="dbtn">+1 day</button>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2">
                <button @click="addTicket('AUTO')" class="dbtn">+ Auto ticket</button>
                <button @click="addTicket('MANUAL')" class="dbtn">+ Manual ticket</button>
            </div>
            <button @click="reset" class="mt-2 w-full text-xs bg-red-500/20 text-red-300 py-1.5 rounded hover:bg-red-500/40">
                Reset demo data
            </button>
            <div v-if="store.events.length" class="mt-3 border-t border-gray-700 pt-2 space-y-1 max-h-[120px] overflow-y-auto">
                <div v-for="(e, i) in store.events" :key="i" class="text-[10px] text-gray-400 leading-snug">{{ e.msg }}</div>
            </div>
            <div class="mt-3 text-[10px] text-gray-500 leading-tight">
                * Auto tickets pass 30 min after creation, only within {{ win }} UTC.
                Manual tickets pass automatically after 48h if nobody reviews them.
            </div>
        </template>
    </div>
    `,
    setup() {
        const collapsed = ref(false);
        // ?console=0 隐藏面板，用于截图
        const visible = new URLSearchParams(location.search).get('console') !== '0';
        const watTime = computed(() => formatWat(store.now));
        const utcTime = computed(() => formatUtc(store.now));
        const inWindow = computed(() => inAutoWindow(store.now));
        const advance = (m) => advanceClock(m);
        const reset = () => resetDemo();
        const win = `${AUTO_WINDOW_UTC.start}–${AUTO_WINDOW_UTC.end}`;
        return { store, visible, collapsed, watTime, utcTime, inWindow, advance, addTicket, reset, win };
    }
};

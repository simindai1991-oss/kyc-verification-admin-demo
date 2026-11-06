const MENUS = [
    { name: 'Users（Nigeria）', icon: 'fa-regular fa-circle-user' },
    { name: 'KYC Verification', icon: 'fa-solid fa-right-left', active: true },
    { name: 'Account Setting', icon: 'fa-solid fa-right-left' },
    { name: 'Freeze', icon: 'fa-solid fa-right-left' },
    { name: 'Savings Redeem', icon: 'fa-regular fa-rectangle-list' },
    { name: 'Ka Verification', icon: 'fa-solid fa-right-left' },
    { name: 'Merchant(Nigeria)', icon: 'fa-solid fa-right-left' }
];

export default {
    template: `
    <aside class="sidebar">
        <div class="sidebar-logo">
            <div class="text-[24px] font-extrabold tracking-tight leading-none">OPay</div>
            <div class="text-[11px] font-semibold opacity-90 mt-1">Microfinance Bank</div>
        </div>
        <nav class="mt-10">
            <div v-for="m in menus" :key="m.name"
                 class="sidebar-item" :class="{ active: m.active }">
                <i :class="m.icon" class="w-5 text-center mr-3 opacity-90"></i>{{ m.name }}
            </div>
        </nav>
    </aside>
    `,
    setup() {
        return { menus: MENUS };
    }
};

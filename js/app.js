const { createApp, ref } = Vue;

import SideMenu from './components/SideMenu.js';
import TopBar from './components/TopBar.js';
import DebugPanel from './components/DebugPanel.js';
import KycList from './views/KycList.js';
import { loadDemo } from './store.js';

const TABS = [
    { key: 'customerList', label: 'Customer List' },
    { key: 'myCustomerList', label: 'My Customer List' },
    { key: 'reviewList', label: 'Review List' },
    { key: 'report', label: 'Report' },
    { key: 'threePartyVerification', label: 'Three-party verification' }
];

loadDemo();

const app = createApp({
    components: {
        'side-menu': SideMenu,
        'top-bar': TopBar,
        'debug-panel': DebugPanel,
        'kyc-list': KycList
    },
    setup() {
        const tab = ref('customerList');
        return { tab, tabs: TABS };
    }
});

if (window.ElementPlus) {
    app.use(window.ElementPlus);
}

app.mount('#app');

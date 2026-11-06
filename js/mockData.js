// 初始工单：相对当前时间生成，覆盖自动排队 / 人工待领 / 已领 / 通过 / 拒绝几种状态
import { OPERATOR } from './config.js';

const NAMES = [
    'GERALD UCHE DAMASUS', 'IBRAHIM SANI MUHAMMAD', 'SANI RIMI ABUBAKAR', 'DIVINE CHIGOZIE ILOMA',
    'EBUBE DAVID MADU', 'AKABAI GOODNESS GABRIEL', 'ESTHER SOAR EGBEIYON', 'MOHAMMED DAUDA',
    'OLADIPUPO TAJUDEEN', 'IKEMEFUNA KELVIN EZUGWU', 'CHUKWUEMEKA OBI', 'FATIMA BELLO YUSUF',
    'ADEBAYO OLUWASEUN', 'NGOZI PATIENCE EZE', 'MUSA ALIYU GARBA', 'BLESSING AMAKA NWOSU',
    'TUNDE KAREEM LAWAL', 'HAUWA ISA MAIGARI', 'EMMANUEL OKON UDO', 'AISHA BALA SULE',
    'CHIOMA GRACE OKAFOR', 'YUSUF ABDULLAHI', 'KEHINDE ADEOLA', 'GODWIN EFFIONG BASSEY',
    'ZAINAB UMAR FARUK', 'SAMUEL OJO AKINWALE', 'JOY ONYINYE AGU', 'ABUBAKAR SADIQ',
    'VICTORIA OSAS IDAHOSA', 'PETER CHINEDU ANI', 'RUKAYAT ADEWALE', 'FRIDAY ETIM'
];

const PREFIXES = ['803', '806', '810', '813', '816', '703', '706', '903', '906', '701', '805', '807',
    '809', '811', '812', '814', '815', '817', '818', '708', '802', '808', '901', '902'];

const OTHER_REVIEWERS = ['adaeze.okafor@opay-inc.com', 'tunde.bello@opay-inc.com'];

let s = 20261106;
const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
};
const digits = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// [reviewType, status, 创建距今分钟, 审核/领取人]
const PLAN = [
    // 自动审核排队中：列表里的大头
    ...[3, 9, 14, 21, 38, 55, 80, 130, 200, 260, 330, 400, 470, 520].map((m) => ['AUTO', 'available', m]),
    // 需要人工、待领取（2650 分钟这单离 48h 兜底不到 4 小时）
    ...[12, 95, 300, 610, 1300, 2100, 2650].map((m) => ['MANUAL', 'available', m]),
    ['MANUAL', 'claimed', 700, OPERATOR],
    ['MANUAL', 'claimed', 450, OTHER_REVIEWERS[0]],
    ['MANUAL', 'claimed', 1500, OTHER_REVIEWERS[1]],
    ...[1500, 1900, 2400, 3100, 3600, 4200, 5000].map((m) => ['AUTO', 'pass', m, 'System · auto review']),
    ['MANUAL', 'pass', 2600, OPERATOR],
    ['MANUAL', 'pass', 4300, OTHER_REVIEWERS[0]],
    ['MANUAL', 'pass', 6500, 'System · 48h fallback'],
    ['MANUAL', 'rejected', 3000, OTHER_REVIEWERS[1]],
    ['MANUAL', 'rejected', 6100, OPERATOR]
];

export function makeTicket({ nowMs, type, status = 'available', ageMin = 0, by = null, index }) {
    const createdMs = nowMs - ageMin * MIN - Math.floor(rnd() * 50) * 1000;
    const prefix = PREFIXES[index % PREFIXES.length];
    const billMs = createdMs - (20 + Math.floor(rnd() * 40)) * DAY;
    const reviewed = status === 'pass' || status === 'rejected';
    return {
        id: `T${Date.now().toString(36)}${index}${digits(3)}`,
        createdAt: new Date(createdMs).toISOString(),
        userId: `1566${digits(16)}`,
        name: NAMES[index % NAMES.length],
        phone: `+234${prefix}${digits(7)}`,
        kyc: 3,
        kycCompliance: 'yes',
        referenceCode: `KYC${digits(10)}`,
        billDate: type === 'AUTO' ? new Date(billMs).toISOString().slice(0, 10) : null,
        status,
        claimedBy: status === 'claimed' || (reviewed && by && by.includes('@')) ? by : null,
        reviewedBy: reviewed ? by : null,
        reviewedAt: reviewed ? new Date(createdMs + 40 * MIN).toISOString() : null
    };
}

export function buildSeed(nowMs) {
    s = 20261106;
    const tickets = PLAN.map(([type, status, ageMin, by], index) =>
        makeTicket({ nowMs, type, status, ageMin, by, index }));
    // 固定一单方便演示手机号检索：08023029847
    const demo = tickets.find((t) => !t.billDate && t.status === 'available' && t.name === 'IBRAHIM SANI MUHAMMAD')
        || tickets.find((t) => !t.billDate && t.status === 'available');
    demo.phone = '+2348023029847';
    return tickets;
}

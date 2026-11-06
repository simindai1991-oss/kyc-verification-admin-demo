// 全局演示配置（时效口径对齐《KYC Verification 表单重做——业务事实陈述》）

// seed 结构变动时改 key，强制浏览器重新加载初始数据
export const STORAGE_KEY = 'kyc-verification-demo-v1';

// 当前登录的审核员
export const OPERATOR = 'simin.dai@opay-inc.com';

// 有 billdate → 自动审核，创建后 30 分钟通过（kyc.made.audit.auto.time.interval.minute）
export const AUTO_PASS_MINUTES = 30;

// 无 billdate → 人工审核，48 小时未处理系统兜底通过（AUDIT_OPERATOR = 2880）
export const MANUAL_FALLBACK_MINUTES = 2880;

// 自动审核只在这个 UTC 时间窗内执行（kyc.made.audit.auto.time.start / end）
export const AUTO_WINDOW_UTC = { start: '08:00:01', end: '19:00:00' };

// 尼日时间 WAT = UTC+1，列表时间和日期筛选都按 WAT
export const WAT_OFFSET_HOURS = 1;

// Claim 100 单次最多领取数量
export const CLAIM_BATCH = 100;

// 日期筛选默认区间：含今天在内最近 7 天
export const DEFAULT_RANGE_DAYS = 7;

export const PAGE_SIZE = 10;

export const STATUS_OPTIONS = ['available', 'claimed', 'pass', 'rejected'];

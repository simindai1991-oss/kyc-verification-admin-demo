# 理财AD后台 KYC Verification 审核列表优化

## 一、修订版本

| **时间** | **版本号** | **修订人** | **修订内容** |
| --- | --- | --- | --- |
| 2026-11-06 | V1.0 | 戴思敏 | 创建 |

## 二、需求背景

MFB AD 后台 KYC Verification 的 Customer List 里，自动审核单和需要人工的单混在一起。有 billdate 的单 30 分钟自动通过，没有 billdate 的才需要人工 Claim，但列表里只能靠 Operate 列有没有 Claim 按钮逐条找。截图里 pass 有 92218 单，available 只有 496 单，人工单占比很小。

本地审核同事反馈的问题：

- **人工单难找**：大部分是挂着等自动通过的单，需要人工的被淹在里面。
- **只能按客户号查**：一线手上通常只有手机号，要先去别的系统查 userId。
- **日期筛不到今天**：只能筛到昨天的数据。

事实陈述见：[理财AD后台KYC Verification表单重做——业务事实陈述](https://q6oisf77xb.feishu.cn/docx/QBYldPkunoQWApxp4Dsc0eninsf)

## 三、需求范围

| **需求** | **简要说明** |
| --- | --- |
| 【运营后台】Customer List 筛选与列表调整 | 新增 Review Type 筛选（默认只看人工单）、手机号筛选；日期可选今天；Claim 100 只领人工单 |
| 【运营后台】My Customer List | 同步增加手机号筛选 |
| 【服务端】工单查询接口 | 返回人工 / 自动标识，支持按审核类型和手机号查询 |

## 四、需求说明

演示DEMO：https://addemo.desmond.ink/

审核详情页、REVIEW LIST / REPORT / THREE-PARTY VERIFICATION 三个页签保持线上不变。

### 4.1 Customer List 筛选区

图注：Customer List 默认视图（只显示需要人工审核的单）
![Customer List 默认视图](https://documents-exchange.oss-cn-beijing.aliyuncs.com/projects/kyc-verification-claim-list/assets/20261106_customer-list-manual_3408.png)

- **Review Type**（新增，放在筛选区最前面）
  - 两个选项：`Manual Review`（默认选中）、`All`。
  - `Manual Review`：只显示需要人工审核的单，即钱包侧审核时没填 billdate 的单。
  - `All`：人工单和自动单都显示。
  - 切换后立即刷新列表，不需要再点 search。
  - 是否还要单独的 `Auto Review` 选项（待业务确认）。
- **Status**
  - 保持多选，选项 `available` / `claimed` / `pass` / `rejected`。
  - Customer List 默认选中 `available`，可清空看全部状态。
- **Date**
  - 默认区间为最近 7 天，含今天，e.g. 今天 06/11/26 时默认 31/10/26 – 06/11/26。
  - 可以选到今天，今天之后的日期不可选。
  - 按尼日时间（WAT, UTC+1）自然日筛选，结束日期包含当天 23:59:59。
  - 快捷选项：`Today`、`Last 7 days`、`Last 30 days`。
  - 页面停留跨天后，结束日期停在「今天」的区间自动顺延到新的今天。
- **Phone**（新增）
  - 输入框 placeholder：`e.g. 08012345678`。
  - 支持以下写法，统一去掉空格和符号后取后 10 位精确匹配：
    - `08012345678`（11 位，带 0）
    - `8012345678`（10 位）
    - `2348012345678` / `+234 801 234 5678`
  - 不支持脱敏号和模糊匹配。
  - 格式不对时点 search 不查询，输入框标红，下方提示：`Please enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.`
- **User ID / Reference Code**：保持精确匹配。
- **组合查询**：各筛选项之间取交集；Phone、User ID、Reference Code、Status、Date 点 `search` 或回车后生效。
- **reset**（新增）：恢复默认，即 `Manual Review` + `available` + 最近 7 天，清空输入框。

图注：手机号检索（输入 08023029847 命中 +2348023****47）
![手机号检索](https://documents-exchange.oss-cn-beijing.aliyuncs.com/projects/kyc-verification-claim-list/assets/20261106_phone-search_bbbf.png)

### 4.2 顶部统计

- 保留 `available` / `claimed` / `pass` / `rejected` 四个计数，口径不变。
- 在 available 后面新增 `need manual review` 计数：需要人工且状态为 available 的单数。

### 4.3 列表

图注：Review Type 切到 All 时人工单和自动单都显示，只有人工单有 Claim
![Review Type 为 All 时的列表](https://documents-exchange.oss-cn-beijing.aliyuncs.com/projects/kyc-verification-claim-list/assets/20261106_customer-list-all_b399.png)

- **列**：保持线上 `Date / userId / Name / Phone / KYC / Status / KycCompliance / Operate`，不新增列。
- **排序**：按工单创建时间倒序，保持线上。
- **Date 列**：表头改为 `Date (WAT)`，按尼日时间展示，格式保持 `Nov 06,2026 10:32:20`。
- **Status 列**：已审核的单在状态下面显示审核人，系统通过的显示 `System · auto review` 或 `System · 48h fallback`。
- **Operate 列**
  - 人工单 + available：显示 `Claim`。
  - 自动单：不显示 `Claim`，自动单不允许人工领取。
  - 已被自己领取：显示 `Claimed by me`。
  - 已被他人领取：显示领取人账号。
- **空态**：`Manual Review` 下没有数据时显示 `No tickets need manual review.`，其他情况显示 `No records found.`

### 4.4 Claim

- **单条 Claim**：点击后工单状态变为 claimed，领取人为当前账号，toast `Claimed. You can review it in My Customer List.`
- **Claim 100**
  - 只领人工单（无 billdate）且状态为 available 的单，由远及近最多 100 单，不受当前筛选条件影响。
  - 成功 toast `Claimed ${n} manual review ticket(s).`
  - 没有可领的单时 toast `No manual review tickets available to claim.`

### 4.5 My Customer List

- 筛选区增加 Phone 筛选，规则同 4.1；不展示 Review Type 和 Claim 100。
- 默认 Status 为 `claimed`，日期默认最近 7 天。
- Operate 保持 `unclaim`，审核入口保持线上不变。

### 4.6 服务端

- 工单查询接口返回审核类型字段，e.g. `reviewType = MANUAL / AUTO`，判定依据为钱包侧审核时是否填写了 billdate。现有数据模型是否已有可直接用的字段（待技术确认）。
- 查询接口增加入参：
  - `reviewType`：`MANUAL` 只返回人工单，不传返回全部。
  - `phone`：前端传归一后的 10 位号码，服务端按完整手机号后 10 位精确匹配。
- 日期入参按尼日时间自然日处理，修复当前筛不到当天的问题。
- 顶部统计接口增加 `need manual review` 计数。
- Claim 100 领取范围限定为人工单。
- 时效规则保持不变：自动单创建后 30 分钟在自动审核时间窗内通过，人工单 48h 未处理系统兜底通过。

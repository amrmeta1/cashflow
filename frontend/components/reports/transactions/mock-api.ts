import type {
  Transaction,
  TransactionFilters,
  UpdateTransactionPayload,
  BulkRecategorizePayload,
  Category,
  TransactionType,
  TransactionStatus,
  Counterparty,
} from "./types";
import { CATEGORIES } from "./types";

// ── Imported transactions (from CSV import) ───────────────────────────────────

const IMPORTED_STORAGE_KEY = "cashflow_imported_transactions";

export interface ImportedRowPayload {
  date: string;
  rawText: string;
  amount: number;
  currency: string;
  aiVendor: string;
}

function loadImportedFromStorage(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMPORTED_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveImportedToStorage(txns: Transaction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(IMPORTED_STORAGE_KEY, JSON.stringify(txns));
  } catch {
    // ignore quota
  }
}

/** Convert imported row payloads to Transaction and append to stored imports. Call after user confirms CSV import. */
export function addImportedTransactions(
  tenantId: string,
  rows: ImportedRowPayload[]
): void {
  const existing = loadImportedFromStorage();
  const accountId = "imported-1";
  const accountName = "Imported";
  const now = new Date().toISOString();
  const newTxns: Transaction[] = rows.map((r, i) => ({
    id: `imported-${Date.now()}-${i}`,
    tenant_id: tenantId,
    txn_date: (r.date || now.slice(0, 10)).slice(0, 10),
    amount: r.amount,
    currency: r.currency || "SAR",
    type: (r.amount >= 0 ? "inflow" : "outflow") as TransactionType,
    status: "cleared" as TransactionStatus,
    description: r.rawText?.slice(0, 200) || "—",
    counterparty: { name: r.aiVendor?.slice(0, 64) || "—", type: "vendor" as const },
    category: "Other" as Category,
    account_id: accountId,
    account_name: accountName,
    reference: undefined,
    notes: undefined,
    created_at: now,
    updated_at: now,
  }));
  const merged = [...newTxns, ...existing];
  saveImportedToStorage(merged);
}

function getImportedTransactions(): Transaction[] {
  return loadImportedFromStorage();
}

const COUNTERPARTIES: Counterparty[] = [
  // ── Scored clients (AI profiled) ──────────────────────────────────────────
  {
    name: "TechCorp L.L.C",
    type: "client",
    aiTrustScore: "A+",
    averageDelayDays: 0,
    aiInsight: "Reliable payer. Usually settles invoices exactly on or before the due date.",
    aiInsightAr: "عميل موثوق. يسدد الفواتير عادةً في تاريخ الاستحقاق أو قبله.",
  },
  {
    name: "Gulf Ventures Co.",
    type: "client",
    aiTrustScore: "B",
    averageDelayDays: 8,
    aiInsight: "Generally reliable. Occasional minor delays of up to 10 days. Low risk.",
    aiInsightAr: "موثوق بشكل عام. تأخيرات طفيفة أحياناً لا تتجاوز ١٠ أيام. مخاطر منخفضة.",
  },
  {
    name: "Al-Noor Contracting",
    type: "client",
    aiTrustScore: "C",
    averageDelayDays: 24,
    aiInsight: "Warning: Habitual late payer. AI has automatically shifted expected cash-in for this client by +24 days in the forecast model.",
    aiInsightAr: "تحذير: عميل متأخر بشكل معتاد. قام الذكاء الاصطناعي بتأجيل التدفقات المتوقعة لهذا العميل بمقدار +٢٤ يوماً في نموذج التوقعات.",
  },
  {
    name: "Horizon Real Estate",
    type: "client",
    aiTrustScore: "F",
    averageDelayDays: 60,
    aiInsight: "Critical Risk: Severe historical delays averaging 60 days. Recommended to switch to upfront payment terms immediately.",
    aiInsightAr: "خطر حرج: تأخيرات تاريخية شديدة بمتوسط ٦٠ يوماً. يُوصى بالتحويل فوراً إلى شروط الدفع المسبق.",
  },
  // ── Vendors (no AI score) ─────────────────────────────────────────────────
  { name: "Saudi Aramco",       type: "vendor" },
  { name: "SABIC",              type: "vendor" },
  { name: "Al Rajhi Bank",      type: "vendor" },
  { name: "STC",                type: "vendor" },
  { name: "Mobily",             type: "vendor" },
  { name: "Jarir Bookstore",    type: "vendor" },
  { name: "Panda Retail",       type: "vendor" },
  { name: "Careem",             type: "vendor" },
  { name: "Noon",               type: "vendor" },
  { name: "Amazon SA",          type: "vendor" },
  { name: "Ministry of Finance",type: "vendor" },
  { name: "GOSI",               type: "vendor" },
  { name: "Zain KSA",           type: "vendor" },
  { name: "Riyad Bank",         type: "vendor" },
  { name: "NCB",                type: "vendor" },
];

const ACCOUNTS = [
  { id: "acc-001", name: "Al Rajhi Current" },
  { id: "acc-002", name: "Riyad Bank Savings" },
  { id: "acc-003", name: "NCB Business" },
];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTransactions(): Transaction[] {
  const txns: Transaction[] = [];
  const now = new Date();

  for (let i = 0; i < 120; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 90));
    const isInflow = Math.random() > 0.45;
    const amount = isInflow
      ? Math.round((Math.random() * 180000 + 5000) * 100) / 100
      : -Math.round((Math.random() * 95000 + 1000) * 100) / 100;
    const account = randomItem(ACCOUNTS);
    const category = randomItem(CATEGORIES);
    const types: TransactionType[] = ["inflow", "outflow", "transfer"];
    const statuses: TransactionStatus[] = ["cleared", "pending", "reconciled"];

    txns.push({
      id: `txn-${String(i + 1).padStart(4, "0")}`,
      tenant_id: "tenant-001",
      txn_date: d.toISOString().slice(0, 10),
      amount,
      currency: "SAR",
      type: isInflow ? "inflow" : Math.random() > 0.9 ? "transfer" : "outflow",
      status: randomItem(statuses),
      counterparty: randomItem(COUNTERPARTIES),
      description: `${isInflow ? "Payment from" : "Payment to"} ${randomItem(COUNTERPARTIES).name}`,
      category,
      account_id: account.id,
      account_name: account.name,
      reference: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      notes: Math.random() > 0.7 ? "Reviewed and approved" : undefined,
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    });
  }

  return txns.sort((a, b) => b.txn_date.localeCompare(a.txn_date));
}

let _store: Transaction[] = generateTransactions();

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

const DEFAULT_TX_LIMIT = 2000;
const MAX_TX_LIMIT = 10000;

export async function fetchTransactions(
  tenantId: string | undefined,
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  await delay();
  const imported = getImportedTransactions();
  const tenantImported = tenantId
    ? imported.filter((t) => t.tenant_id === tenantId)
    : imported;
  let rows = [...tenantImported, ..._store];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.counterparty.name.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q)
    );
  }
  if (filters.category) rows = rows.filter((t) => t.category === filters.category);
  if (filters.type) rows = rows.filter((t) => t.type === filters.type);
  if (filters.status) rows = rows.filter((t) => t.status === filters.status);
  if (filters.from) rows = rows.filter((t) => t.txn_date >= filters.from!);
  if (filters.to) rows = rows.filter((t) => t.txn_date <= filters.to!);
  if (filters.account_id) rows = rows.filter((t) => t.account_id === filters.account_id);

  // Sort by date desc (newest first)
  rows = [...rows].sort((a, b) => (b.txn_date || "").localeCompare(a.txn_date || ""));

  const limit = Math.min(MAX_TX_LIMIT, filters.limit ?? DEFAULT_TX_LIMIT);
  const offset = Math.max(0, filters.offset ?? 0);
  return rows.slice(offset, offset + limit);
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> {
  await delay(400);
  const idx = _store.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Transaction not found");
  _store[idx] = { ..._store[idx], ...payload, updated_at: new Date().toISOString() };
  return _store[idx];
}

export async function bulkRecategorize(
  payload: BulkRecategorizePayload
): Promise<Transaction[]> {
  await delay(500);
  const updated: Transaction[] = [];
  for (const id of payload.ids) {
    const idx = _store.findIndex((t) => t.id === id);
    if (idx !== -1) {
      _store[idx] = {
        ..._store[idx],
        category: payload.category,
        updated_at: new Date().toISOString(),
      };
      updated.push(_store[idx]);
    }
  }
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  await delay(300);
  _store = _store.filter((t) => t.id !== id);
}

export const ACCOUNTS_LIST = ACCOUNTS;

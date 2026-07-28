import fs from "node:fs";
import path from "node:path";

// Local, file-backed stand-in for the §9 Postgres schema — see
// docs/DECISIONS.md "M2 — local JSON store + fixture-mode auth replace
// Supabase for M2 onward". Used whenever AIMS_FIXTURE_MODE=true. Mirrors the
// SQL table names/shapes closely enough that swapping back to Supabase is a
// data-access-layer change, not a schema rethink.

const DATA_DIR = path.join(process.cwd(), "local-data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

export interface StoreSchema {
  users: any[];
  modules: any[];
  assessments: any[];
  questions: any[];
  rubrics: any[];
  rubric_criteria: any[];
  submissions: any[];
  submission_pages: any[];
  detected_lines: any[];
  transcriptions: any[];
  solution_steps: any[];
  grade_recommendations: any[];
  criterion_results: any[];
  final_grades: any[];
  misconceptions: any[];
  misconception_tags: any[];
  feedback: any[];
  feedback_flags: any[];
  resources: any[];
  resource_chunks: any[];
  practice_sets: any[];
  practice_items: any[];
  practice_attempts: any[];
  stage_runs: any[];
  audit_log: any[];
}

const TABLES: (keyof StoreSchema)[] = [
  "users",
  "modules",
  "assessments",
  "questions",
  "rubrics",
  "rubric_criteria",
  "submissions",
  "submission_pages",
  "detected_lines",
  "transcriptions",
  "solution_steps",
  "grade_recommendations",
  "criterion_results",
  "final_grades",
  "misconceptions",
  "misconception_tags",
  "feedback",
  "feedback_flags",
  "resources",
  "resource_chunks",
  "practice_sets",
  "practice_items",
  "practice_attempts",
  "stage_runs",
  "audit_log",
];

function emptyStore(): StoreSchema {
  const store = {} as StoreSchema;
  for (const t of TABLES) store[t] = [];
  return store;
}

function load(): StoreSchema {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const fresh = emptyStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const store = emptyStore();
  Object.assign(store, raw);
  return store;
}

function save(store: StoreSchema) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

export const localStore = {
  insert<T extends Record<string, any>>(table: keyof StoreSchema, row: T): T & { id: string } {
    const store = load();
    const withId = { id: row.id ?? crypto.randomUUID(), ...row };
    store[table].push(withId);
    save(store);
    return withId;
  },

  insertMany<T extends Record<string, any>>(table: keyof StoreSchema, rows: T[]): (T & { id: string })[] {
    const store = load();
    const withIds = rows.map((row) => ({ id: row.id ?? crypto.randomUUID(), ...row }));
    store[table].push(...withIds);
    save(store);
    return withIds;
  },

  update(table: keyof StoreSchema, id: string, patch: Record<string, any>) {
    const store = load();
    const idx = store[table].findIndex((r: any) => r.id === id);
    if (idx === -1) throw new Error(`${String(table)}.${id} not found`);
    store[table][idx] = { ...store[table][idx], ...patch };
    save(store);
    return store[table][idx];
  },

  get(table: keyof StoreSchema, id: string) {
    const store = load();
    return store[table].find((r: any) => r.id === id) ?? null;
  },

  all(table: keyof StoreSchema) {
    return load()[table];
  },

  find(table: keyof StoreSchema, predicate: (row: any) => boolean) {
    return load()[table].filter(predicate);
  },

  findOne(table: keyof StoreSchema, predicate: (row: any) => boolean) {
    return load()[table].find(predicate) ?? null;
  },
};

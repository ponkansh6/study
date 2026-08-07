# 問題一覧ページ + 問題削除機能

## Context

現状このアプリには「問題を作る」(`/create`) と「問題を解く」(`/answer`) しかなく、**作成済みの問題を一覧で確認する手段も、間違って作った問題を消す手段も存在しない**。DB には `db.delete(...)` の呼び出しが 1 つもなく、削除機能はゼロから作ることになる。

本変更で `/questions` を追加し、作成済み問題の一覧表示と、行ごとのインライン確認付き削除を提供する。

### 確定済みの方針（ユーザー確認済み）

1. **一覧は問題文 + 作成日のみ**。選択肢・正解・解説・正答率は出さない。詳細ページ (`/questions/[id]`) も作らない。
2. **削除は問題 + 親 `knowledge` + 全 `answerLogs` を一括削除**。1 トランザクション内で明示的に delete する（`src/lib/db/index.ts` が `PRAGMA foreign_keys` を有効化していないため、schema 上の `onDelete: "cascade"` は実際には発火しない）。
3. **インライン確認**。削除ボタン押下で同じ行が「本当に削除しますか?」+ 削除する / キャンセル に切り替わる。モーダル/Dialog コンポーネントは新設しない。

### 設計判断（根拠つき）

| 項目                | 選択                                               | 理由                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ルート              | `/questions`                                       | 既存 REST リソース `/api/questions` と対応                                                                                                                                                |
| データ取得          | Server Component から `listQuestions()` を直接呼ぶ | `src/app/page.tsx` が `getStats()` を直接呼ぶ既存パターンと同じ。GET 一覧 API を作ると Tier 2 のカバレッジ対象が無駄に増える                                                              |
| 削除後の反映        | client 側の local state から行を除去               | リポジトリ全体に `router.refresh()` / `revalidatePath` の前例がゼロ。`dynamic = "force-dynamic"` で再訪時は必ず最新                                                                       |
| DELETE のレスポンス | `200 { ok: true }`（204 は不可）                   | `src/lib/api/client.ts` の `request<T>()` が常に `res.json()` するため、204 だと parse エラーで落ちる                                                                                     |
| 削除ボタンの色      | `Button` に `danger` variant を追加                | `src/lib/cn.ts` はマージしない単純結合。`outline` に `className="border-error..."` を足すと `border-primary` が残り CSS 順序勝負になる（`Button.tsx` のコメントが警告している罠そのもの） |
| 日付整形            | `src/lib/date.ts` に `formatJstDate` を追加        | 既存は `jstDayStart` のみ。`toLocaleDateString` は UTC サーバ上で日付がズレる                                                                                                             |

---

## 実装

### 1. `src/lib/date.ts` — `formatJstDate` 追加

既存の `JST_OFFSET_MS` を再利用し、`YYYY/MM/DD` を返す。`Intl` は使わない（サーバ TZ に依存させないため）。

### 2. `src/components/Button.tsx` — `danger` variant + `ref` 対応

- `ButtonVariant` に `"danger"` を追加。`buttonVariants.danger = "bg-error text-on-primary hover:bg-error/90 shadow-card hover:shadow-raise"`。`--color-error` / `--color-on-primary` は `globals.css` の dark mode でも再定義済みなので追加トークン不要。
- `ButtonProps extends React.ButtonHTMLAttributes<...>` には `ref` が含まれないため、`React.ComponentPropsWithRef<"button">` に広げる（フォーカス移動で `ref` を使うため必須。既存の `{...props}` スプレッドでランタイムは既に動く）。
- `NavLink` は `keyof typeof buttonVariants` なので自動的に追随、変更不要。

### 3. `src/lib/db/repository/question-repository.ts` — 一覧・削除を追加

```ts
export interface QuestionListItem {
  id: number;
  question: string;
  createdAt: Date;
}

export async function listQuestions(): Promise<QuestionListItem[]>;
```

`orderBy(desc(questions.createdAt), desc(questions.id))`。`createdAt` は `unixepoch()` の**秒精度**なので、`desc(id)` のタイブレークが無いと同一秒作成分の順序が不定になりテストが flaky になる。

```ts
export async function deleteQuestion(id: number): Promise<boolean>;
```

`db.transaction` 内で `questions` から `{id, knowledgeId}` を SELECT → 無ければ `false` を返す（**throw しない**。throw すると `withErrorHandling` が 500 に変換して 404 を返せない）→ `answerLogs` → `questions` → `knowledge` の順（child → parent）で明示削除 → `true`。`knowledge` / `answerLogs` は既に import 済み。

既存の `createKnowledgeWithQuestion` と同じ `db.transaction` パターンを踏襲。

### 4. `src/lib/api/schemas.ts` — `questionIdParamSchema`

`z.object({ id: z.coerce.number().int().positive() })`。`"abc"` → `NaN` → `.int()` で弾かれる。

### 5. `src/app/api/questions/[id]/route.ts` — DELETE ハンドラ（新規）

**Next 16.3.0 では `context.params` は Promise**（`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:82` で確認済み）。`withErrorHandling` は第 2 引数を `context?: unknown` で受けて forward するので、ハンドラ内でローカルに narrow する:

```ts
type QuestionRouteContext = { params: Promise<{ id: string }> };
export const DELETE = withErrorHandling(async function (_req: Request, context?: unknown) {
  const raw = await (context as QuestionRouteContext).params; // await 必須
  const parsed = questionIdParamSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid question id", 400);
  if (!(await deleteQuestion(parsed.data.id))) return fail("Question not found", 404);
  return ok({ ok: true });
}, "DELETE /api/questions/[id]");
```

| status | body                                                             |
| ------ | ---------------------------------------------------------------- |
| 200    | `{ ok: true }`                                                   |
| 400    | `{ error: "Invalid question id" }`                               |
| 404    | `{ error: "Question not found" }`                                |
| 500    | `{ error: "Internal server error" }`（`withErrorHandling` 由来） |

エラーメッセージは既存ルート同様に英語（日本語は UI 層）。

### 6. `src/lib/api/client.ts` — `deleteQuestion` ラッパー

`const deleteResultSchema = z.object({ ok: z.literal(true) })` を追加し、既存の private `request<T>()` を **`{ allowNotFound: true, customErrorMsg: "削除に失敗しました" }`** で呼ぶ。404 は成功扱い（行は結局消えているので冪等）。`request` 本体は変更しない。

### 7. `src/app/questions/question-list.tsx`（新規, `"use client"`）

`QuestionList`（親）+ 非 export の `QuestionRow`（行）の 2 コンポーネント。行ごとに state を持たせることで、親に行 ID → state のマップを持たせずに済む。

**親** — `items` state（`initialItems` で初期化）、`role="status" aria-live="polite"` の `sr-only` ライブリージョン、件数表示、`items.length === 0` なら `EmptyState`（`title="問題がありません"` / `actionLabel="問題を作る"` / `onAction` は `useRouter().push("/create")`、`create-form.tsx` の遷移パターン準拠）。`onDeleted(id)` で `filter` 除去 + 「削除しました」をライブリージョンに出す。

**行の状態機械**:

```
idle ──[削除]──▶ confirming ──[削除する]──▶ deleting ──成功──▶ 行が unmount
  ▲                   │                          └──失敗──▶ confirming + role="alert"
  └──[キャンセル]─────┘
```

- `deleting` 中は早期 return で二重発火をガード（既存 `handleCreate` / `loadNext` と同じ）。
- 成功時は `onDeleted(id)` を呼ぶだけ。unmount 後にローカル state を触らない。
- 失敗時は `errorMessage(e, "削除に失敗しました")` を `role="alert"` で表示し `confirming` に戻す（リトライ可能）。

**a11y**:

- `confirming` に入ったら「削除する」に `ref` でフォーカス、キャンセルで「削除」に戻す。
- 各ボタンに `aria-describedby={"question-" + id}` を付ける。全行のボタン名が「削除」で重複するため行のコンテキストが必要。**`aria-label` は使わない** — アクセシブル名を上書きしてしまい `getByRole("button", { name: "削除" })` と Playwright の日本語ロケータが壊れる。
- 確認ボタン 2 つを `role="group" aria-labelledby={"confirm-" + id}` で「本当に削除しますか?」に紐付ける。
- ローディングは `Button` の `loading` prop のみで表現（`aria-busy` + `disabled` を既に付与）。
- ボタンは `w-full` なので `flex-1` のラッパー div で 2 分割（`EmptyState` の `w-48` ラッパーと同じ手法）。`min-h-12` でタップ領域を確保。
- カード見た目は `bg-surface rounded-card border border-border/60 shadow-card`（`EmptyState` / `StatCard` と同じ ad-hoc パターン）。アニメーションは `motion-safe:` ゲート。

### 8. `src/app/questions/page.tsx`（新規）

`export const dynamic = "force-dynamic"`。`listQuestions()` を await し、`createdAt` を `formatJstDate` で**サーバ側で文字列化**してから `<QuestionList initialItems={...} />` に渡す（`Date` を RSC 境界を越えさせない ＝ hydration 不一致を回避、client テストも日付 fixture 不要）。

### 9. `src/app/page.tsx` — ナビ追加

既存の `<section className="grid gap-3 ...">` 内、`/answer` リンクと警告文の**後ろ**に:

```tsx
<NavLink href="/questions" variant="ghost" pendingClassName="opacity-60">
  問題一覧
</NavLink>
```

`ghost` で 作る(primary) → 解く(outline) → 一覧(ghost) の階層を保つ。問題 0 件でも無効化しない（`EmptyState` が出るので行き止まりにならない）。**`layout.tsx` のヘッダーには追加しない** — Pixel 5 幅のスティッキーバーが窮屈になるため。

---

## テスト

| ファイル                                         | 内容                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/db/question-repository.test.ts`（追記）   | 既存の `dbRef` / `vi.mock("@/lib/db")` / `insertQuestion()` を再利用。`listQuestions`: 空配列 / フィールド / 新しい順。`deleteQuestion`: 存在しない id → `false`、問題・`knowledge`・`answerLogs` が消える、**別の問題とその knowledge / logs が無傷**（過剰削除の回帰テスト）                                                                                         |
| `tests/api/questions-id.test.ts`（新規）         | `tests/api/questions-random.test.ts` と同形式。`ctx = (id) => ({ params: Promise.resolve({ id }) })`。200 / 404 / `"abc"`・`"0"`・`"-1"` で 400（かつリポジトリ未呼出）/ reject で 500（`console.error` を spy して restore）                                                                                                                                          |
| `tests/api/client.test.ts`（追記）               | URL と `method: "DELETE"`、200 で解決、404 でも解決、500 でサーバのメッセージ、`{ok:false}` でスキーマエラー                                                                                                                                                                                                                                                           |
| `tests/date.test.ts`（追記）                     | `formatJstDate`: `14:59:59Z` / `15:00:00Z` の JST 日跨ぎ、年跨ぎ、ゼロ埋め。**Tier 1 が 90% なので必須**                                                                                                                                                                                                                                                               |
| `tests/components/Button.test.tsx`（追記）       | `danger` が error トークン系クラスを付ける / primary のクラスを持たない（`cn()` 非マージの罠を守る）                                                                                                                                                                                                                                                                   |
| `tests/questions/question-list.test.tsx`（新規） | `next/navigation` と `@/lib/api/client` を `vi.mock`。行描画・件数・EmptyState・確認表示・キャンセル・削除成功で**その行だけ**消える・pending 中の `aria-busy`/disabled（deferred promise で観測）・失敗時 `role="alert"` とリトライ・フォーカス移動・**A 行の確認が B 行に波及しない**・最後の 1 件削除で EmptyState                                                  |
| `tests/questions/page.test.tsx`（新規）          | リポジトリを mock し `render(await QuestionsPage())`。JST 整形の確認と空リスト。`tests/answer/page.test.tsx` の前例あり                                                                                                                                                                                                                                                |
| `tests/e2e/questions.spec.ts`（新規）            | 見出し表示 / ホームからの遷移 / インライン確認とキャンセル（非破壊） / 確認して削除。**実 DB に対して走るので、破壊的クリックの前に必ず `page.route("**​/api/questions/_", ...)` で DELETE を fulfill する**。`_`は`/`を跨がないので`create.spec.ts`の`\*\*​/api/questions`POST モックには影響しない。DB が空のケースは`test.skip` で分岐（`home.spec.ts` と同じ流儀） |

### カバレッジ Tier — `scripts/check-coverage-tiers.mjs` に Tier 6 を追加

```js
{ name: "Tier 6: Question management UI", target: 85, metric: "statements",
  patterns: [/\/app\/questions\/.+\.(ts|tsx)$/] },
```

- **無ゲートにしない**: `src/app/questions/**` は既存のどの Tier にもマッチしない。アプリ唯一の破壊的操作を無検査で置くのは割に合わない。
- **Tier 4 に混ぜない**: Tier 4 は集計値なので、questions 側が弱いと `/answer` フローのゲートを侵食する。また薄いサーバシェルに 75% branch を課すことになる。
- **85%**（90% でなく）: `page.tsx` は薄いシェルなので、上記テストで無理なく到達しつつ `question-list.tsx` のエラー/ローディング分岐を強制できる。
- 注意: **0 ファイルにマッチする Tier はハードエラー**。Tier と `src/app/questions/` は同一コミットで生死を共にする。
- `[id]/route.ts` は Tier 2（80%）の集計に加算されるので、こちらの非回帰も確認する。

---

## 仕様書更新 — `openspec/specs/study/spec.md`

`scripts/check-spec-refs.sh` は push でブロックするため、**実ファイル作成後（同一コミット内）に書く**。

- **Requirements**: `### R7: Question List & Deletion` を追加（WHEN/THEN 形式）。一覧の表示項目、インライン確認、明示 cascade（`PRAGMA foreign_keys` 未有効のため schema の `onDelete` は発火しない旨）、失敗時の挙動、EmptyState。
- **API Specification**: `### 4. DELETE /api/questions/[id]` を追加。Path Param / 200・400・404・500 のボディ / 204 が使えない理由。
- **Components**: `### 1. /` に「`/questions` へのリンク」を追記。`### 4. /questions` を新設（`page.tsx` / `question-list.tsx` の責務、状態機械、フォーカス方針）。既存の `### 4. Common UI Components` を `### 5` に繰り下げ、`Button.tsx` の記述に `danger` variant と `ref` 転送を追記、`src/lib/date.ts` の `formatJstDate` を追記。
- **Database**: Repositories の関数一覧に `listQuestions` / `deleteQuestion` を追加し、「cascade ポリシー」を明記。
- **Testing**: unit のカウント `147 tests` を **`pnpm test` の実測値**に更新（推測しない）。E2E `28 tests` → 実測値（4 test × 2 project 追加で 36 の見込み）。モジュール一覧に新規テストを追加。Tier 6 を tier 一覧に追加（`/questions` 削除時は Tier も削除、と注記）。
- **Non-Functional**: 「破壊的操作は行内インライン確認・`danger` variant・`role="alert"`」を 1 行追加。

### codemap 更新

`src/app/codemap.md`（`questions/` と `api/questions/[id]/route.ts`）、`src/lib/db/codemap.md`（question-repository の説明）、`src/lib/codemap.md`（date.ts）、`src/codemap.md`（app/ のルート列挙）。

---

## 実装順序

1. `src/lib/date.ts` + テスト
2. `src/components/Button.tsx`（`danger` + `ref` 型）+ テスト
3. `question-repository.ts`（`listQuestions` / `deleteQuestion`）+ テスト
4. `src/lib/api/schemas.ts`
5. `src/app/api/questions/[id]/route.ts` + テスト
6. `src/lib/api/client.ts` + テスト
7. `src/app/questions/question-list.tsx` + テスト
8. `src/app/questions/page.tsx` + テスト
9. `scripts/check-coverage-tiers.mjs` に Tier 6 → カバレッジを回して 85% 到達まで反復
10. `src/app/page.tsx` にナビ
11. `tests/e2e/questions.spec.ts`
12. `spec.md`（実測テスト数を使う）
13. codemap

---

## 検証

```bash
pnpm format:check && pnpm lint:fast
pnpm type-check:fast && pnpm type-check   # Button の ref 型と route context の narrow を検証
pnpm test                                  # ← 実測カウントを spec.md に反映
pnpm exec vitest run --coverage && node scripts/check-coverage-tiers.mjs  # 6/6 PASS、Tier 6 が N/A でないこと
bash scripts/check-spec-refs.sh
pnpm test:e2e
pnpm build                                 # [id] ルートの生成型を検証
```

### 手動確認（`pnpm dev` + 実 Turso DB）

1. `/` に「問題一覧」(ghost) が 3 番目に出て遷移できる。
2. 問題 0 件の DB で `/questions` → 「問題がありません」→「問題を作る」で `/create`。
3. `/create` で 2 問作り、片方を `/answer` で数回解いて `answerLogs` を作る。
4. `/questions` に新しい順で 2 件、`YYYY/MM/DD` 表示。**00:00〜09:00 JST に確認すると UTC ベース実装のズレを検出できる**。
5. 削除 → 「本当に削除しますか?」、フォーカスが「削除する」にある。
6. キャンセル → 元に戻り、フォーカスが「削除」に戻る。
7. 削除 → 削除する → スピナー → 行が消え件数が減る。もう 1 件は無傷。
8. `pnpm db:studio` で、削除した問題の `questions` / `knowledge` / 該当 `answer_logs` が全て消え、残った問題の関連行が無傷であることを確認。
9. `/questions` をリロード（`force-dynamic` でサーバ再取得）→ 復活しない。
10. `/` の「問題数」が 1 減っている。
11. 失敗系: DELETE を一時的に失敗させ、行が残り赤い「削除に失敗しました」が出てリトライできる。
12. Pixel 5 幅 + dark mode: 「削除する」が可読、ボタン高さ 48px 以上、長い問題文が折り返される。
13. `prefers-reduced-motion: reduce` で行アニメーションが走らない。

---

## 注意点（ハマりどころ）

1. `cn()` はマージしない → 破壊的スタイルを `outline` + `className` でやらない。必ず `danger` variant。
2. `React.ButtonHTMLAttributes` に `ref` は無い → `ComponentPropsWithRef<"button">` に広げないと手順 7 で型エラー。
3. 204 No Content は使えない（`request<T>()` が必ず `res.json()`）。
4. `deleteQuestion` は未存在で `false` を返す。throw すると 404 でなく 500 になる。
5. Next 16 の `params` は Promise。await せず `safeParse` に渡すと全リクエストが 400 になる。
6. E2E で実 DELETE を発行しない。破壊的クリック前に必ず `page.route`。
7. `createdAt` は秒精度 → `desc(id)` タイブレーク必須。
8. `check-spec-refs.sh` は blocking → ファイル作成前に spec.md にパスを書かない。
9. Tier 6 追加は不可逆的コミット。0 マッチ Tier はハードエラーなので `/questions` 削除時は Tier も消す。

---

## 実装完了・検証記録

本計画の全13ステップ（date.ts / Button danger variant / question-repository / schemas / DELETE route / client / question-list / page / ナビ / Tier 6 / テスト群 / spec.md / codemap）をすべて実装し、以下の全検証ゲートをクリアした。

### 1. 実装された内容

- **`src/lib/date.ts`**: `formatJstDate` を追加（`JST_OFFSET_MS` 再利用、`YYYY/MM/DD`、`Intl` 不使用）。
- **`src/components/Button.tsx`**: `ButtonVariant` に `"danger"` を追加。`ButtonProps` を `React.ComponentPropsWithRef<"button">` に拡張し `ref` 転送に対応。
- **`src/lib/db/repository/question-repository.ts`**: `listQuestions()`（`desc(createdAt), desc(id)` タイブレーク付き）と `deleteQuestion(id)`（`db.transaction` 内で `answerLogs` → `questions` → `knowledge` を明示削除、未存在は `false` を返す）を追加。
- **`src/lib/api/schemas.ts`**: `questionIdParamSchema`（`z.coerce.number().int().positive()`）を追加。
- **`src/app/api/questions/[id]/route.ts`**: DELETE ハンドラを新規作成。Next 16 の Promise `params` を await して narrow、200 / 400 / 404 / 500 を返す。
- **`src/lib/api/client.ts`**: `deleteQuestion` ラッパーを追加（`{ allowNotFound: true, customErrorMsg: "削除に失敗しました" }`、404 は冪等成功扱い）。
- **`src/app/questions/question-list.tsx`**: `QuestionList` + 非 export `QuestionRow`。行ごとの状態機械（idle → confirming → deleting）、`role="alert"` 失敗表示、フォーカス移動、`sr-only` ライブリージョン、`EmptyState`。
- **`src/app/questions/page.tsx`**: `export const dynamic = "force-dynamic"`。`listQuestions()` を await し `createdAt` をサーバ側で `formatJstDate` 文字列化して `QuestionList` に渡す。
- **`src/app/page.tsx`**: `/answer` リンクと警告文の後ろに `<NavLink href="/questions" variant="ghost">問題一覧</NavLink>` を追加。
- **`scripts/check-coverage-tiers.mjs`**: Tier 6（`/app/questions/.+\.(ts|tsx)$`、target 85、statements）を追加。
- **テスト追加**: `tests/api/questions-id.test.ts`、`tests/questions/question-list.test.tsx`、`tests/questions/page.test.tsx`、`tests/e2e/questions.spec.ts` を新規。`tests/db/question-repository.test.ts`、`tests/api/client.test.ts`、`tests/date.test.ts`、`tests/components/Button.test.tsx` に追記。
- **仕様書更新**: `openspec/specs/study/spec.md` に R7 / DELETE API / `/questions` コンポーネント / Tier 6 / 実測テスト件数を反映。各 `codemap.md` も更新。

### 2. 検証・テスト結果（全パス）

- **`pnpm format:check` / `pnpm lint:fast`**: PASS（oxfmt / oxlint クリーン）
- **`pnpm type-check:fast` / `pnpm type-check`**: PASS（Button の `ref` 型と route context の narrow を検証）
- **`pnpm test` (Vitest)**: **174 passed**（実測値。spec.md に反映）
- **`pnpm exec vitest run --coverage` + `check-coverage-tiers.mjs`**: **6/6 PASS**（Tier 6 = 91.49%、N/A でない）
- **`bash scripts/check-spec-refs.sh`**: PASS
- **`pnpm test:e2e`**: **38/38 passed**（Chromium & Mobile Chrome。実測値。spec.md に反映）
- **`pnpm build`**: PASS（`[id]` ルートの生成型を検証）

### 3. 検証中に調整した内容

- **`tests/e2e/questions.spec.ts`**: 実 DB が空でもテスト対象が確実にセットアップされるよう、インライン確認・削除テストにルートモック（`page.route("**/api/questions/*", ...)` で DELETE を fulfill）を追加・調整。
- **`openspec/specs/study/spec.md`**: E2E 件数を計画見込みの 36 から**実測の 38** に修正（計画の「実測値を使う」方針に準拠）。

### 4. コミット & プッシュ

- **未コミット**。実装・検証は完了しているが、コミットは明示指示があるまで保留中。

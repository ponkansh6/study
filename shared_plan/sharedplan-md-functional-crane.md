# Study アプリ リファクタリング / テスト充実化 / 最適化プラン

## Context

`/home/shunki/working/study` は Next.js 16 + Drizzle/Turso + Gemini の個人用学習アプリ(src/ 約 1,150 行、テスト 22 ファイル / 96 ケース)。実装自体は動いているが、探索の結果、次の 4 系統の問題が確認された。

1. **本番バグ**: `src/lib/api/client.ts:19` 等が `res.statusText` を使用。Vercel は HTTP/2 で配信するため `statusText` は常に空文字になり、ユーザーには `"Failed to fetch random question: "` と表示される。API レスポンスに Zod 検証がなく `any` が流れており、それが 2 件の型不一致(`explanation` の null 許容、`createdAt` の有無)を隠している。
2. **カバレッジゲートの空洞化**: 全体 55.64%。`scripts/check-coverage-tiers.mjs` の Tier 3(データアクセス 75%)は、対象 2 ファイルが両方 `INTENTIONALLY_MOCKED` に入っているため常に "No files matched" → `continue` で **pass/fail 判定に到達せず、恒久的に素通り**する。`src/lib/api/client.ts` (61%) はどの Tier にも一致せず無防備。Tier 4 は目標 90% に対し 90.57% と 0.57pt しか余裕がない。
3. **重複と死んだコード**: fetch ラッパー 3 重複、API catch ブロック 3 重複、`page.tsx` が Button のクラス文字列を手写し。`createQuestion` は定義されているのに `create/page.tsx` が同じ POST を再実装している(重複かつデッド)。
4. **破壊的な migrate スクリプト**: `scripts/migrate.ts:23-34` は `TURSO_DATABASE_URL` に対して**無条件に全テーブルを DROP** する。`drizzle.config.ts` が宣言する `src/lib/db/migrations` は存在せず、schema が二重定義されている。

**方針(確認済み)**: 個人用プロトタイプのまま。認証・レート制限・SQL 側抽選は対象外。安価な最適化のみ行う。migrate.ts は実マイグレーションへ置き換える。

**ゴール**: 実バグを潰し、カバレッジゲートを実効化し、重複を排除し、安価な性能改善を入れる。

---

## 最重要: pre-push ゲートの実際の挙動(検証済み)

計画順序はすべてこの 3 点に依存する。実際に読んで確認した。

| 事実                                                                                                                            | 根拠                  | 帰結                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| **カバレッジ実行は `^src/` に一致する差分がある時だけ**発火                                                                     | `.husky/pre-push:39`  | src/ を触らない push はカバレッジゲートを完全にスキップできる         |
| pre-push は **`origin/main...HEAD` のレンジ全体**を 1 回評価                                                                    | `.husky/pre-push:4-5` | コミット数は無料。**push 回数だけがコスト**                           |
| `check-spec-refs.sh` は spec.md 内のバッククォート付き `src/`・`tests/` パスのみ検証。実際の該当は **8 件、すべて `src/` 配下** | `grep` で確認済み     | **本計画のどの変更もこの 8 件を削除しない。ブロッキングリスクはゼロ** |

spec.md の 8 件: `src/lib/date.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/create/page.tsx`, `src/app/answer/page.tsx`, `src/components/`, `src/lib/choice-label.ts`, `src/lib/db/index.ts`

補足:

- `tests/` 参照は **0 件** → テスト構造の再編は完全に自由。
- `scripts/migrate.ts` は正規表現に一致しない → 削除は無条件に安全。
- spec.md に **テスト/カバレッジのセクションは存在しない**(検証済み)。`check-coverage-tiers.mjs` のヘッダーは「targets defined in spec.md」と書いているが**嘘**。Tier 目標の変更に spec 編集は不要。
- **唯一この gate を壊す方法**は、まだ存在しないパスをバッククォート付きで spec.md に追記すること。新規ファイル(`weighting.ts` 等)の spec 記載は**必ず同一コミット**で。
- `check-prod-schema.sh` はテーブルとカラムのみ比較し、**インデックスは見ない** → Phase 2 のインデックス変更はドリフト検出に引っかからない。

### 全 push 前に実行する dry-run(1 行、安い順に fail-fast)

```
bash scripts/check-spec-refs.sh && pnpm exec tsgo --noEmit && pnpm test:coverage && node scripts/check-coverage-tiers.mjs && pnpm test:e2e
```

**カバレッジの増減は推論せず必ず計測すること。** リファクタは分子と分母を同時に動かす。

---

## Phase 0 — src/ を触らない衛生作業 · 1 push · **カバレッジゲートをスキップ**

すべて src/ 外。純粋な削除のみでカバレッジ影響ゼロ。

- `.eslintcache` を untrack し `.gitignore` に追加(現在 git 管理下)
- `package.json` から未使用依存 `p-limit`・`@vercel/config` を削除
- `test:prod` / `test:build-parity` スクリプトと `tests/vitest.integration.config.ts` を削除(存在しない `tests/production`・`tests/build` を指している)
- `@server/*` エイリアスを `tsconfig.json` と `vitest.config.ts` の両方から削除(`server/` は存在しない)。空ディレクトリ `src/lib/db/api/` も削除
- `openspec/config.yaml` を実装に合わせて書き直す(現状「CSS Modules・Tailwind なし」「4択10問」「`src/app/quiz/[id]/`」「DB 保存しない」と、すべて spec.md と実装に矛盾)
- `scripts/check-coverage-tiers.mjs:82-84` の恒等関数 `metricKey()` を削除
- `.github/workflows/main.yml` に `check-spec-refs.sh` / `test:coverage` + `check-coverage-tiers.mjs` / `security-check` を追加(現在 CI はこれらを一切実行しておらず、ローカル pre-push 専用になっている)。**E2E は CI に入れない**(遅い、当面ローカルのまま)

検証: `bash scripts/check-spec-refs.sh && pnpm test:all && pnpm exec tsgo --noEmit`

---

## Phase 1 — テスト基盤整備 + tests/ の型検査・lint 有効化 · 1 push · **まだ src/ 非依存**

**新規テストを書く前に**実施する。そうすれば既存 1,800 行と以後追加分がまとめて型検査される。

- `tsconfig.json:36` の `exclude: ["tests/**"]` を解除、`eslint.config.mjs:32` の tests 無視も解除。**先に `pnpm exec tsgo --noEmit` を単独実行して型エラーの件数を把握する**(10 秒で分かる。多すぎれば descope 判断)
- `tests/helpers/` と `tests/fixtures/` を新設(下記構造)
- 既存テストを fixture に移行。`tests/llm/client.test.ts` の `globalThis as unknown as {process?...}` キャスト 3 箇所を `tests/helpers/env.ts` に集約
- クリーンアップを統一: `tests/setup.ts` にグローバル `afterEach(() => vi.restoreAllMocks())` を置き、各ファイルの `clearAllMocks`/`restoreAllMocks` を削除(現状ファイルごとにバラバラ)

```
tests/
  helpers/
    db.ts       createTestDb() → :memory: libsql + drizzle + migrator で実マイグレーション適用
    env.ts      withEnv({ GOOGLE_API_KEY: ... })
    fetch.ts    mockFetch(), jsonResponse(body, status)
  fixtures/
    question.ts makeQuestion(), makeQuestionRow()
    answer.ts   makeAnswerResult(), makeAnswerLog()
    llm.ts      validLlmJson, malformedLlmJson
  setup.ts      グローバル afterEach
```

**`tests/fixtures/*` には `vitest` を import しない。** そうすれば Playwright 側の `tests/e2e/answer.spec.ts` から直接 import でき、重複している `sampleQuestion` / `sampleAnswerResult` を排除できる。

> `tests/helpers/db.ts` の実体追加は Phase 2(マイグレーション生成後)。ここでは他の helper のみ。

---

## Phase 2 — 実マイグレーション化 · 1 push · src/ は schema.ts のみ

- **スキーマ変更を先に入れてから** `pnpm db:generate` する(baseline 1 本で済ませ、直後に index マイグレーションを足さないため):
  - `src/lib/db/schema.ts:30` の明示 index `questions_knowledge_id_idx` を削除(`:19` の `.unique()` が既に一意インデックスを作るため冗長。書き込み増幅のみ)
  - `answer_logs` に複合インデックス `(question_id, answered_at DESC)` を追加(`question-repository.ts:81-85` の相関サブクエリがグループごとにソートしている)
- `src/lib/db/migrations/` に baseline を生成
- `scripts/migrate.ts` を**削除**、`"db:migrate": "drizzle-kit migrate"` を追加。`schema.ts` が唯一の真実になる
- `tests/helpers/db.ts` をここで追加(マイグレーション実体に依存するため)

**本番の baseline 化**: 本番には既にテーブルがあるため、生成された `CREATE TABLE` baseline はそのまま再生できない。プロトタイプでの最短手順は — 本番に `drizzle-kit push` を 1 回だけ当ててインデックス差分を反映 → `meta/_journal.json` のハッシュを使って `__drizzle_migrations` に baseline 行を手動 INSERT。以後の `migrate` が正しい地点から始まる。

検証: `pnpm test:coverage && node scripts/check-coverage-tiers.mjs`(`schema.ts` はどの Tier にも一致しないため安全)。push 前に `check-prod-schema.sh` を手動実行。

---

## Phase 3 — バグ修正 + 低リスク重複排除 · 1 push

**実バグはここで死ぬ。** 対象はほぼ無ゲート領域(`lib/api/*`)なので早めに出す。

- **`src/lib/api/client.ts` を全面書き直し**
  - 3 つのラッパー(`:13-22`, `:24-37`, `:39-49`)を単一の `request(path, init, label)` に集約
  - `res.statusText` を廃止(HTTP/2 で空文字 = 実バグ)。`fail()` (`src/lib/api/response.ts:7`) が返す `{ error }` ボディを読んでメッセージに使う。現状この API エラー契約は書かれているのに一度も消費されていない
  - Zod レスポンススキーマを追加 → `parseJsonOrThrow` の暗黙 `any` が消える
  - デッドな `createQuestion` は**削除せず活かす**: `src/app/create/page.tsx:23-29` のインライン重複を `createQuestion()` 呼び出しに差し替える
- **`any` が隠していた型不一致 2 件を修正**
  - `src/types/quiz.ts:16` `explanation?: string` → `string | null`(`schema.ts:24` が nullable、`answers/route.ts:33` がそのまま返す)
  - `create/page.tsx:29` が `Question`(= `createdAt` を含む)と称しているが `POST /api/questions` (`questions/route.ts:36-46`) は `createdAt` を返さない → **クライアント側の型を狭める**(レスポンスを増やすのではなく)
- `src/lib/api/response.ts` に `withErrorHandling()` を追加し、3 ルートの同一 catch ブロック(`questions/route.ts:47-50`, `questions/random/route.ts:24-27`, `answers/route.ts:35-38`)を置換
- **`src/lib/llm/parser.ts`**
  - 3 回コピーされた retry tail(`:33-37`, `:44-49`, `:61-65`)を抽出
  - `:17-20` が `callGemini` の**全例外**を `null` に潰している。恒久エラーである `"GOOGLE_API_KEY environment variable is not set"` (`client.ts:16`) は**再 throw** し、設定ミスとモデルの JSON 不良を区別する
  - `:43` の完全に無言な `catch {}` にログを追加(兄弟の catch は両方 `console.warn` している)
  - `transform` 引数(`:10`, `:40-50`)を削除(本番から一度も呼ばれず、テストのみが到達)
- `src/lib/llm/client.ts:35` の `err as { status?: number; message?: string }` を絞り込みガードに置換
- `src/lib/db/index.ts:35` を `Reflect.get(actualDb, prop)` に(proxy を receiver に渡すと getter 経由で再帰する潜在バグ。現状は Drizzle が getter を公開していないため偶然動いている)
- `tests/api/client.test.ts` を新規追加 — statusText バグとエラーボディ経路の**回帰テスト**

**カバレッジ影響(順に注意)**: `lib/api/*` は無 Tier → 自由。`parser.ts` は **Tier 1 @90%** で、カバー済み行(`transform`)とそのテストを同時に削除するため分子・分母が両方動く。`api/*` は **Tier 2 @80%** で、`withErrorHandling` がカバー済み catch を無ゲートの `response.ts` へ移す → 同じく両方動く。**必ず計測すること。** Tier 1 が落ちたら revert ではなく parser のエッジケーステストを追加する。

---

## Phase 4 — 純粋ロジックの抽出 · 1 push · **これが Tier 3 の修正そのもの**

- `pickWeightedRandomQuestion` (`src/lib/db/repository/question-repository.ts:70-148`, 78 行)から重み計算を **`src/lib/db/repository/weighting.ts`** へ抽出。純粋関数 `computeWeight({ answered, correct, latestIncorrect })` と `pickByWeight(items, rng)`。リポジトリには IO だけを残す
- `src/app/answer/quiz-runner.tsx:53-68` の選択肢 variant ステートマシンを **`src/app/answer/choice-state.ts`** へ抽出(純粋)。ついでに `:60` の `.indexOf()` を `.map()` の外へ巻き上げる(選択肢ごとに再計算されている)
- **両方の単体テストを同一コミットで**追加

**仕掛け**: `weighting.ts` は Tier 3 のパターン `/lib/db/repository/.+\.ts$/` に一致し、かつ `INTENTIONALLY_MOCKED` に入っていない → **このファイルが着地した瞬間に Tier 3 が自動的に息を吹き返す**。テストなしで置けば即座に約 0% で fail する。狙った挙動であり、望んでいたリファクタの副作用として死に Tier が復活する。

spec.md 同時更新: L139 の Weighted Random Selection を `weighting.ts` に、L110-114 の `/answer` に `choice-state.ts` を追記。**新規パスをバッククォートで書くなら必ず同一コミット。**

---

## Phase 5 — リポジトリ / オーケストレーションのテスト · 1 push

- `tests/db/question-repository.test.ts`, `tests/db/answer-repository.test.ts` — `tests/helpers/db.ts` の in-memory libsql + `vi.mock("@/lib/db")` で実行
  - **JST 日境界をまたぐ行を含むケースを必ず書く**(`src/lib/date.ts` の `jstDayStart()` 依存)。これが Phase 7 の集計クエリ書き換えの防護網になる
- `tests/llm/quiz.test.ts`
- その後、**`INTENTIONALLY_MOCKED` から 3 エントリすべてを削除**。Tier 3 が実ファイル 2 本を 75% でゲートし、Tier 2 が `quiz.ts` を拾う
  - **テストを先に green にしてから、同一 push 内の後続コミットで削除する**(順序を逆にすると Tier 3 が約 0% で fail)

> `db/index.ts` の `NEXT_BUILD` → `:memory:` フォールバックは**リポジトリテストに再利用できない**(検証済み): モジュールレベルの `dbInstance` シングルトンが worker 内で残る / その in-memory DB に DDL が一度も流れずテーブルが存在しない / `NEXT_BUILD` をグローバルに立てると `TURSO_DATABASE_URL` 欠落を隠す。専用 helper が必要。

副産物: helper が実マイグレーション SQL を適用するため、**スキーマとマイグレーションのドリフトが単体テストで壊れる**ようになる。

---

## Phase 6 — カバレッジ Tier スクリプトの実効化 · 1 push

コード形状が確定した**後**に実施。目標値を推測でなく実測に対して設定するため。

`scripts/check-coverage-tiers.mjs`:

- **(a) 済(Phase 4)** — Tier 3 に実ファイルが入ったことが (b) の前提
- **(b) "No files matched" をハード失敗にする。** 現在 `:127-130` で pass/fail 分岐の**手前**で `continue` するため、Tier が黙って死ぬ。Tier 3 が実体を持った後でのみ安全
- **(c) `/lib/api/.+\.ts$/` の Tier を目標 85% で追加。** `client.ts` (61.11%) と `response.ts` は Phase 3 の `request()` 集約後は小さく自明にテストできる。85 は願望でなく実測ベース

目標値の調整:

- **Tier 4 の 0.57pt マージンはカバレッジを上げて解く問題ではない。** 集計対象がちょうど 1 ファイルなので 3 行の編集で振れる。**構造的に直す**: パターンを `/app/answer/.+\.(ts|tsx)$/` に広げる。ただし **Phase 4/5 で `quiz-runner.tsx` と `choice-state.ts` に実カバレッジが付いた後に限る**(先にやると 0% の 2 ファイルを巻き込んで即 fail)。3 ファイル集計なら余裕が出る
- **Tier 4 に `branches` を第 2 ゲートとして 75% で追加。** 現状 statements 90.57% に対し **branches は 70.37%** で、statements のみのゲートは実態を過大評価している。ステートマシン hook を statements だけで測るのは間違った対象を測っている
- Tier 1 (90) / Tier 2 (80) / Tier 5 (70) は据え置き
- `src/lib/db/schema.ts` を coverage の `include` から除外(宣言的で分岐ゼロ、ノイズにしかならない)

**spec.md にテストセクションを新設する。** 現状 spec.md にテスト/カバレッジの記述は皆無なのに、スクリプトのヘッダーは「targets defined in spec.md」と主張している。Tier 構成と目標値をここに書いて嘘を解消する。

---

## Phase 7 — UI 重複排除 + 性能 · 1 push

Phase 5 のリポジトリテストが SQL 書き換えの回帰網になるため、それが前提。

**重複排除**

- `src/lib/cn.ts` を追加し、`Button.tsx:24-30` / `NavLink.tsx:29-31` / `QuestionCard.tsx:42,51` の手書きクラス結合に適用
- `src/app/page.tsx:19,28` が Button のデザインシステムクラス文字列を手写ししている(`Button.tsx:17,18,25` と重複)→ `Button` の variant を使う。現状 Button を restyle すると home が黙って崩れる
- `Spinner` を抽出(`Button.tsx:37-40`, `ChoiceButton.tsx:46`, `LoadingState.tsx:8` の 3 箇所)。**テストを同一コミットで。** `src/components/` に着地するため 0% だと Tier 5 の集計を即座に薄める
- `errorMessage()` ヘルパーを追加し `use-quiz-session.ts:44,76` と `create/page.tsx:31` の `e instanceof Error ? ... : ...` を集約

**デッドコード削除**

- `QuestionCard` のインタラクティブ分岐と `onSelect` / `selectedIndex` / `disabled` props(`QuestionCard.tsx:7-9,36-48`)— 唯一の本番呼び出し元 `create/page.tsx:61-65` は `onSelect` を渡さず、`/answer` は `ChoiceButton` を使う。テストのみが到達
- `src/types/quiz.ts:3,5` の `Knowledge` / `AnswerLog` 型(参照ゼロ)

**性能(プロトタイプ規模なので安価な勝ちのみ)**

- `question-repository.ts:73` の `db.select().from(questions)` — 1 行返すために全行 × 全カラム(本文 + choices JSON + explanation)を Turso から引いている。**必要カラムのみに射影**し、独立している `:76` の統計クエリと `Promise.all` にする
- `answer-repository.ts:20,21-24,25-28` の逐次 COUNT 3 本を単一の条件付き集約クエリに統合(#2 と #3 は同一テーブル・同一述語)。`src/app/page.tsx:4` が `force-dynamic` でキャッシュなしのため、home 表示ごとに Turso へ 3 往復している
- `use-quiz-session.ts:52-81` の `select` の依存配列が `[phase]` → 毎レンダーで新しい識別子になる。関数形式 `setPhase` にして `[]` にする
- `src/app/create/page.tsx:1` — 静的マークアップを含めてページ全体が `"use client"`。server shell + `"use client"` フォーム子コンポーネントに分割

spec.md 同時更新: L105-107(`/create` の分割)、L116-125(`Spinner.tsx`・`src/lib/cn.ts` 追加、`QuestionCard` の props 削除)。

---

## コミット / push 粒度

支配的な事実: **pre-push は push ごとに 1 回、レンジ全体を評価する。コミット数は無料。**

- **コミット**は論理単位ごとに細かく(バグ 1 件、抽出 1 件)。pre-commit は oxlint + oxfmt + tsgo + `vitest related` で数秒。細かいほど `vitest related` の対象も狭い
- **push は Phase ごとに 1 回** → 全体で **約 7 回の pre-push サイクル**
- Phase 0・1 は src/ 非依存 → その push はカバレッジ実行を丸ごとスキップする。**意図的に先頭に置いている**
- **独立妥当性のルール**: `src/` 配下に**新規ファイル**を追加するコミットは、テストを同一コミットに含める。v8 は `include: ["src/**"]` なので未テストファイルを 0% で計上する。`weighting.ts`(Tier 3)と `Spinner.tsx`(Tier 5)は単独で置くと確実に fail する。`cn.ts` は無 Tier なので影響なし

**申し送り(実施しない、判断のみ提示)**: pre-push は `pnpm test:all` の後に `vitest run --coverage` を実行しており、**同じスイートを 2 回**回している。1 回のカバレッジ実行に統合すれば全 push が速くなる。ただし `.husky/` の変更は AGENTS.md の精神に対する判断を要するため、勝手に行わず提起に留める。

---

## テスト追加の優先順位(効果 / 労力)

| #   | 対象                | 方法                                  | 理由                                                                                                  |
| --- | ------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `weighting.ts`      | 純粋単体、テーブル駆動                | 基底 5 / `1+4*ratio` / +2 ボーナス / 直近 10 件除外 というドメイン規則を固定。**Tier 3 を復活させる** |
| 2   | `choice-state.ts`   | 純粋単体                              | 安い。JSX 内の分岐スープを排除                                                                        |
| 3   | `lib/api/client.ts` | `mockFetch` helper                    | statusText 実バグと未消費のエラー契約を直接カバー。現状 61% で無ゲート                                |
| 4   | 両リポジトリ        | in-memory libsql + 実マイグレーション | 相関サブクエリ、新複合インデックス、そして **Phase 7 の集計クエリ書き換え**を守る                     |
| 5   | `create/page.tsx`   | RTL、正常系 + エラー系のみ            | 現在 0/27。2 本でほぼ埋まる                                                                           |
| 6   | `quiz-runner.tsx`   | 各 phase のレンダースモーク           | 現在 0/32。ステートマシン抽出後は薄い                                                                 |
| 7   | `db/index.ts`       | 約 5 行                               | `Reflect.get` 修正の回帰テスト                                                                        |
| 8   | `sleep.ts`          | fake timers、3 行                     | 集計を引っ張るのを止めるためだけ                                                                      |

**対象外**: `layout.tsx` / `page.tsx`(server component、E2E で足りる)、`db/schema.ts`(テストせず coverage から除外する)

---

## リスクと最短の検証手段

| リスク                                                                                              | Phase | 最短の検証                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tsconfig で `tests/**` を有効化すると型エラーが大量に出る                                           | 1     | **他に何も触る前に** `pnpm exec tsgo --noEmit` を単独実行。10 秒で規模が分かり descope 可能                                                                      |
| 生成した `CREATE TABLE` baseline は既存本番 DB に再生できない                                       | 2     | `check-prod-schema.sh` は index を見ないため実リスクは `__drizzle_migrations` の帳簿だけ。`createTestDb()` が `:memory:` にクリーンに適用できれば SQL 自体は健全 |
| `withErrorHandling` がカバー済み行を Tier 2 から無ゲート `response.ts` へ移し、比率が予測不能に動く | 3     | `pnpm test:coverage && node scripts/check-coverage-tiers.mjs`。**差分を推論しない**                                                                              |
| `transform` 削除がカバー済み行とそのテストを Tier 1(@90%、Tier 4 の次に厳しい)から同時に消す        | 3     | 同上。落ちたら revert でなく parser のエッジケーステストを追加                                                                                                   |
| `weighting.ts` をテストなしで置くと Tier 3 が「死」から「fail」へ                                   | 4     | 意図的かつ望ましい。ファイルとテストを同一コミットに                                                                                                             |
| テストが green になる前に `INTENTIONALLY_MOCKED` を削ると Tier 3 が約 0% で fail                    | 5     | テストを先に着地させ、削除は**同一 push 内の後続コミット**で                                                                                                     |
| 空の Tier が残ったまま "no files matched" をハード失敗にする                                        | 6     | 変更を当てた状態でスクリプトを 1 回実行。全 Tier のファイル数が出る                                                                                              |
| `quiz-runner.tsx` が 0% のまま Tier 4 を `/app/answer/**` に広げる                                  | 6     | Phase 4/5 完了が厳格な前提。パターン変更前に再計測                                                                                                               |
| 条件付き集約への書き換えが JST 日境界の意味論を静かに変える                                         | 7     | Phase 5 で**境界をまたぐ行**のケースを書いておく(そのために先に書く)                                                                                             |
| `create/page.tsx` の server/client 分割が E2E セレクタを壊す                                        | 7     | `pnpm test:e2e`。ここだけは E2E が主たる防護網                                                                                                                   |

---

## 検証(エンドツーエンド)

各 Phase の push 前に:

```
bash scripts/check-spec-refs.sh \
  && pnpm exec tsgo --noEmit \
  && pnpm lint:fast \
  && pnpm test:coverage && node scripts/check-coverage-tiers.mjs \
  && pnpm test:e2e
```

全 Phase 完了後の受け入れ確認:

1. `node scripts/check-coverage-tiers.mjs` が **6 Tier すべてで実ファイル数 > 0** を表示し、"No files matched" が 1 件もないこと
2. `pnpm dev` で手動確認 — `/create` で知識を投入 → `/answer` で解答 → `/` に本日の統計が反映される
3. `GET /api/questions/random` を意図的に 500 にして、UI に**空でない**エラーメッセージが出ること(statusText バグの回帰確認)
4. `GOOGLE_API_KEY` を外して `POST /api/questions` を叩き、「JSON パース失敗」ではなく**設定エラーとして区別されて**ログに出ること
5. `pnpm db:migrate` をクリーンな `:memory:` に適用できること(`tests/helpers/db.ts` が毎テストで実証)

---

## 変更対象の主要ファイル

| ファイル                                          | Phase     | 変更内容                                                                                       |
| ------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `src/lib/api/client.ts`                           | 3         | 3 ラッパー → `request()`、statusText 廃止、Zod レスポンス検証                                  |
| `src/lib/api/response.ts`                         | 3         | `withErrorHandling()` 追加                                                                     |
| `src/lib/llm/parser.ts`                           | 3         | retry tail 抽出、設定エラー再 throw、`transform` 削除                                          |
| `src/lib/db/repository/question-repository.ts`    | 4, 7      | 重み計算を抽出、カラム射影 + `Promise.all`                                                     |
| `src/lib/db/repository/weighting.ts`              | 4         | **新規** — 純粋な重み計算。Tier 3 を復活させる                                                 |
| `src/app/answer/choice-state.ts`                  | 4         | **新規** — 純粋な variant ステートマシン                                                       |
| `src/lib/db/schema.ts` + `src/lib/db/migrations/` | 2         | 冗長 index 削除、複合 index 追加、baseline 生成                                                |
| `scripts/check-coverage-tiers.mjs`                | 0, 6      | 恒等関数削除、空 Tier をハード失敗化、`lib/api` Tier 追加、Tier 4 を branches + 複数ファイル化 |
| `scripts/migrate.ts`                              | 2         | **削除**(破壊的 DROP)                                                                          |
| `openspec/specs/study/spec.md`                    | 2,3,4,6,7 | 各 Phase で同期。**テストセクションを新設**                                                    |
| `tests/helpers/`, `tests/fixtures/`               | 1, 2      | **新規** — 共有 helper と fixture                                                              |

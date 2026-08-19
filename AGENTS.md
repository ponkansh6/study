## 安全に関するルール

- **`git --no-verify` / `git commit -n` の使用禁止**: pre-commit/pre-push hooks を強制実行。
- **`HUSKY=0` の使用禁止**: husky hook runner 無効化を禁止。

## リソース制約

- **subagent 並行実行(最大3つ)**: 同時に実行するエージェントは最大3つまで。

## 委譲ルール

- Orchestrator は自らコマンド実行しない。以下に委譲:
  - 探索/検索 → `@explorer`
  - 外部調査 → `@librarian`
  - 設計判断/デバッグ → `@oracle`
  - UI実装 → `@designer`
  - 実装作業 → `@fixer`
- **テスト実装とテスト実行は分離する**: テストの実装は `@fixer` に委譲し、テストの実行・検証は Orchestrator 自身が行う。サブエージェントが自分の実装したテストを自ら実行して検証結果を報告する運用は禁止し、Orchestrator が検証ゲート（lint, type-check, test, coverage, spec-refs, smoke-test）を走らせて結果を確認する。
- **実装内容の一致確認**: サブエージェントの実装完了時は、Orchestrator が実装内容（変更差分・成果物）と委譲時の指示内容が一致していることを確認する。乖離があった場合は、指摘して修正を再委譲してから検証ゲートを通過させる。

## 仕様書管理

- **仕様書パス**: `openspec/specs/study/spec.md`
- **更新タイミング**: 実装変更と並行して仕様書を更新。
- **更新ルール**:
  - コンポーネント追加/削除・データモデル変更・API変更・アーキテクチャ変更は仕様書に反映する。
  - Requirements と API セクションを実装と同期させる。
  - 自動チェック: コミット時に spec 関連パスの変更で spec.md 未更新なら警告（`scripts/check-spec-update.sh`、non-blocking）および package.json / pnpm-lock.yaml の片方のみ staged の場合の警告（non-blocking）、push 時に lockfile 同期検証（`scripts/check-lockfile-sync.sh`、blocking）・format チェック（`pnpm format:check`、blocking）・セキュリティチェック（`scripts/check-security.sh`: audit + secretlint、blocking）・spec.md のファイル参照有効性検証（`scripts/check-spec-refs.sh`、blocking）・単体テスト・E2E テスト・カバレッジ Tier チェック・本番ビルド（関連パス変更時）・スキーマドリフト検出を実行。

## 実行モード

- 確認を求めず最後まで自律実行。軽微な修正は連続実行。完了または重大エラーのみ報告。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

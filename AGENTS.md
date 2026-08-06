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

## 仕様書管理

- **仕様書パス**: `openspec/specs/study/spec.md`
- **更新タイミング**: 実装変更と並行して仕様書を更新。
- **更新ルール**:
  - コンポーネント追加/削除・データモデル変更・API変更・アーキテクチャ変更は仕様書に反映する。
  - Requirements と API セクションを実装と同期させる。
  - 自動チェック: コミット時に spec 関連パスの変更で spec.md 未更新なら警告（`scripts/check-spec-update.sh`、non-blocking）、push 時に spec.md のファイル参照の有効性を検証（`scripts/check-spec-refs.sh`、blocking）・E2E テストを実行（blocking）・カバレッジ Tier チェックを実行（`scripts/check-coverage-tiers.mjs`、blocking。外部サービス直結で意図的にモックされるモジュールは判定対象外）。

## 実行モード

- 確認を求めず最後まで自律実行。軽微な修正は連続実行。完了または重大エラーのみ報告。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

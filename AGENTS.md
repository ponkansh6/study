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

## 実行モード

- 確認を求めず最後まで自律実行。軽微な修正は連続実行。完了または重大エラーのみ報告。

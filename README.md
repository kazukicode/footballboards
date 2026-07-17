# フットボール解説用アプリ

TACTICAListaのようなフットボールの戦術ボードアプリです。ピッチ上に選手を配置し、矢印や文字を追加して戦術を解説できます。作成した情報はローカルストレージに保存されます。

## 機能

- サッカーピッチの表示（中央線、センターサークル、ゴール）
- 選手の配置（クリックで追加、ドラッグで移動）
- 矢印の追加（クリックで始点と終点を指定）
- 文字の追加（クリックで配置、ダブルクリックで編集）
- 複数プロジェクトの保存（タイトル付き）
- プロジェクト一覧表示と選択
- 保存機能（ローカルストレージにデータを保存）
- クリア機能（全ての要素を削除）
- 新規作成と既存データ編集の選択

## 使い方

1. `npm install` で依存関係をインストール
2. `npm run dev` で開発サーバーを起動
3. ブラウザで http://localhost:5175 にアクセス
4. 最初の画面で「新しく作成」をクリックし、タイトルを入力して新規プロジェクトを開始
5. 保存済みプロジェクトがある場合は、タイトルをクリックして編集
6. ツールバーから「選手追加」「矢印追加」「文字追加」を選択してピッチを編集
7. 「保存」ボタンでデータを保存（タイトル入力）
8. 「戻る」ボタンでプロジェクト一覧に戻る
9. プロジェクトを削除するには「削除」ボタン

## 技術スタック

- React + TypeScript
- Vite
- Konva.js (Canvas操作)
- react-konva
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

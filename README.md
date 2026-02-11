# 松本 友弥 Portfolio

**松本 友弥** のポートフォリオサイトへようこそ。
このプロジェクトは、洗練されたデザインとユーザー体験を重視し、最新の Web 技術（Next.js, Firebase）を用いて構築された、プロフェッショナルなフォトグラファー/クリエイター向けのポートフォリオ兼クライアントデリバリープラットフォームです。

![Project Banner]([ ]) <!-- スクリーンショットがあればここに -->

## 🚀 特徴 (Features)

### 🎨 Public Portfolio (公開ポートフォリオ)
- **Masonry Layout Gallery**: CSS Columns を使用した美しい組積造レイアウトの写真ギャラリー。
- **Immersive Lightbox**: 高解像度の画像を快適に閲覧できるライトボックス機能。
- **Responsive Design**: モバイルからデスクトップまで、あらゆるデバイスで最適化された表示。
- **Smooth Animations**: Framer Motion による、高級感のある滑らかなトランジションとアニメーション。

### 🛠 Admin Dashboard (管理画面)
- **Secure Authentication**: Firebase Authentication による堅牢なログインシステム。
- **Project Management**: 直感的な UI でのプロジェクト作成・編集・削除。
- **Photo Management**: ドラッグ＆ドロップによる写真のアップロードと並び替え (`@dnd-kit` 使用)。
- **Client Delivery**: パスワード保護されたクライアント専用ページ。

## 💻 技術スタック (Tech Stack)

このプロジェクトは、パフォーマンス、スケーラビリティ、DX（開発者体験）を考慮して選定された最新のスタックで構築されています。

| Category | Technology |
| --- | --- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **UI Library** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Backend / DB** | [Firebase](https://firebase.google.com/) (Firestore, Auth, Storage, Hosting) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **DnD** | [@dnd-kit](https://dndkit.com/) |

## 📦 セットアップ (Getting Started)

ローカル環境でプロジェクトをセットアップする手順です。

### 前提条件 (Prerequisites)
- Node.js (v20 推奨)
- npm

### インストール (Installation)

1. リポジトリをクローンします。
   ```bash
   git clone [ ]
   cd portfolio
   ```

2. 依存関係をインストールします。
   ```bash
   npm install
   ```

3. 環境変数を設定します。
   ルートディレクトリに `.env.local` ファイルを作成し、Firebase の設定情報を記述してください。
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=[ ]
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[ ]
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=[ ]
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[ ]
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[ ]
   NEXT_PUBLIC_FIREBASE_APP_ID=[ ]
   ```

4. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```
   ブラウザで `http://localhost:3000` にアクセスして確認します。

## 🚀 デプロイ (Deployment)

Firebase Hosting へのデプロイ手順です。

1. ビルドを実行します。
   ```bash
   npm run build
   ```

2. Firebase にデプロイします。
   ```bash
   firebase deploy
   ```

## 📂 ディレクトリ構成 (Directory Structure)

```
portfolio/
├── app/                # Next.js App Router ページコンポーネント
│   ├── admin/          # 管理画面用ルート (要認証)
│   └── (public)/       # 一般公開用ルート
├── components/         # 再利用可能な UI コンポーネント
├── lib/                # ユーティリティ関数、Firebase 設定など
├── public/             # 静的ファイル (画像など)
└── ...
```

## 🛡️ ライセンス (License)

This project is licensed under the [ ] License - see the [LICENSE](LICENSE) file for details.

---

Created by **松本 友弥**

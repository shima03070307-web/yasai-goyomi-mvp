# やさい暦 MVP

家庭菜園・小規模菜園向けの栽培管理MVPです。

## Cloudflare Pages

GitHub連携で公開する場合の設定:

- Framework preset: None
- Build command: `exit 0`
- Build output directory: `/` または `.`
- Production branch: `main`

## 気象キャッシュの自動更新

`.github/workflows/update-weather-cache.yml` が、Open-Meteoから500地点分の気象予報を取得し、`data/weather-cache.json` を更新します。

実行時刻:

- 04:00 JST
- 15:00 JST

GitHub ActionsのcronはUTC基準のため、workflowでは `0 6,19 * * *` としています。

手動実行する場合:

GitHubの `Actions` タブから `Update weather cache` を選び、`Run workflow` を押します。

## Cloudflareの再デプロイ

GitHub連携済みのCloudflare Pagesは、通常はGitHubの更新を検知して自動デプロイします。

もしGitHub Actionsによる自動コミット後にCloudflare側が更新されない場合は、Cloudflare PagesのDeploy Hookを作成し、GitHub Secretsに以下の名前で登録してください。

```text
CF_PAGES_DEPLOY_HOOK
```

workflowはこのSecretが存在するときだけ、気象キャッシュ更新後にDeploy Hookを呼び出します。

## 栽培データ追加メモ

2026-06-03の品目追加では、既存品目と重複しないタキイ種苗掲載作物から、家庭菜園で扱いやすい15品目を第一弾として追加しました。

追加品目:

- カリフラワー
- コールラビ
- ロマネスコ
- サラダ菜
- チマサンチュ
- カラシナ
- ナバナ
- ビーツ
- フダンナ
- ミツバ
- モロヘイヤ
- エンサイ
- アイスプラント
- トレビス
- チヂミナ

採用方針:

- 主ソースはタキイ種苗の野菜カテゴリ、品目カテゴリ、栽培マニュアル。
- 温度・日数が品種ごとに異なるものは、家庭菜園MVP向けに中間地で無理のない幅として実装。
- タキイで温度情報が薄い品目は、JA、都道府県農業情報、種苗会社の家庭菜園向け資料を補助監査に使う。
- 直播専用、育苗向き、苗購入向きは、根菜・葉菜・長期作型の一般原則と品目特性から不自然な開始方法を出さないように整理。
- ユーザー向け文言は出典や判定ロジックを出さず、短い理由と次の行動につながる表現にする。

主に確認したタキイ資料:

- https://shop.takii.co.jp/category/00003408
- https://shop.takii.co.jp/selection/cauliflower2011.html
- https://shop.takii.co.jp/category/00005857
- https://shop.takii.co.jp/category/00008398

未確定事項:

- 品種別の収穫日数、寒冷地・暖地の細かな作型差はMVPでは幅で吸収。正式版では品種データ、地域メッシュ気象、ユーザーの栽培場所条件で補正する。

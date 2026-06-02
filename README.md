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

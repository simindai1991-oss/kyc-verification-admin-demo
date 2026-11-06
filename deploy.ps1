# 部署到 Cloudflare Pages：只上传网页文件，docs 和 run.bat 不上网站
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$dist = Join-Path $PSScriptRoot 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory $dist | Out-Null
Copy-Item index.html, css, js, vendor -Destination $dist -Recurse

npx --yes wrangler@4 pages deploy dist --project-name kyc-verification-admin-demo --branch main --commit-dirty=true

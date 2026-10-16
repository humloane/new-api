#!/usr/bin/env bash
#
# server-deploy.sh — 生产服务器部署工作流（Debian 12 + docker compose v2）
#
# 前置条件:
#   - 已 git clone 你的仓库到 $REPO_DIR（默认 /opt/new-api）
#   - $REPO_DIR/.env 已放好（不进 Git，脚本不会修改它）
#   - docker compose v2 可用（docker compose version）
#
# 流程:
#   1) 审核差异   fetch origin，列出当前版本与目标版本之间的提交与文件变更
#   2) 选择版本   默认取最新 aimoxt-* tag；也可 DEPLOY_REF=<tag/分支> 指定
#   3) 拉取更新   checkout 到目标版本（先记录旧版本用于回滚）
#   4) 应用更新   检查 .env 是否缺少新变量（只提示不修改）+ compose 配置校验
#                 + 部署前 PostgreSQL 备份（pg_dump 到 $BACKUP_DIR）
#   5) 网站更新   docker compose build + up -d + 健康检查（失败时打印回滚步骤）
#
# 用法:
#   bash scripts/server-deploy.sh                 # 默认部署最新 aimoxt-* tag
#   DEPLOY_REF=aimoxt-20261016-upstream-d03220473 bash scripts/server-deploy.sh
#   bash scripts/server-deploy.sh preview         # 只做 1)~2)，不 checkout、不动容器
#
# 环境变量（可按需覆盖）:
#   REPO_DIR   仓库路径，默认 /opt/new-api
#   BASE_URL   健康检查地址，默认 http://127.0.0.1:6395（与 compose 端口映射一致）
#   BACKUP_DIR 数据库备份目录，默认 $REPO_DIR/backups
#
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/new-api}"
BASE_URL="${BASE_URL:-http://127.0.0.1:6395}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"

c_red()   { printf '\033[31m%s\033[0m\n' "$*"; }
c_grn()   { printf '\033[32m%s\033[0m\n' "$*"; }
c_yel()   { printf '\033[33m%s\033[0m\n' "$*"; }
c_title() { printf '\n\033[1m=== %s ===\033[0m\n' "$*"; }

cd "$REPO_DIR"

OLD_REF="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

# ---------- 1) 审核差异 ----------
step_review_diff() {
  c_title "1/5 审核差异"
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    c_red "仓库有本地未提交修改（服务器不应出现）:"
    git status --short
    c_red "请先人工检查，不要自动覆盖。"
    exit 1
  fi
  git fetch origin --prune
  c_grn "当前版本: $OLD_REF  ($(git log --oneline -1 HEAD))"
  echo
  c_yel "可用部署 tag（最新 10 个）:"
  git tag -l 'aimoxt-*' --sort=-creatordate | head -10 | cat
}

# ---------- 2) 选择版本 ----------
pick_target() {
  if [[ -n "${DEPLOY_REF:-}" ]]; then
    echo "$DEPLOY_REF"
    return
  fi
  git tag -l 'aimoxt-*' --sort=-creatordate | head -1
}

step_select() {
  c_title "2/5 选择部署版本"
  TARGET="$(pick_target)"
  if [[ -z "${TARGET:-}" ]]; then
    c_red "找不到 aimoxt-* tag。请先在开发机完成同步并推送（见 scripts/dev-sync-upstream.sh），或用 DEPLOY_REF 指定。"
    exit 1
  fi
  git rev-parse -q --verify "refs/tags/$TARGET" >/dev/null || \
    git rev-parse -q --verify "$TARGET^{commit}" >/dev/null || {
      c_red "目标不存在: $TARGET"; exit 1; }
  c_grn "目标版本: $TARGET  ($(git log --oneline -1 "$TARGET^{commit}"))"
  echo
  c_yel "本次将应用的提交（当前 → 目标）:"
  git log --oneline --no-merges "HEAD..$TARGET^{commit}" | cat
  c_yel "变更规模:"
  git diff --stat "HEAD..$TARGET^{commit}" | tail -1
  if [[ "$OLD_REF" == "$(git rev-parse --short "$TARGET^{commit}")" ]]; then
    c_yel "当前已是目标版本，无更新可应用。"
    exit 0
  fi
  echo
  read -r -p "确认部署 $TARGET？[y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { c_yel "已取消。"; exit 0; }
}
# ---------- 3) 拉取更新 ----------
step_pull() {
  c_title "3/5 拉取更新"
  git checkout "$TARGET" 2>/dev/null || git checkout "tags/$TARGET"
  c_grn "已切换到: $(git log --oneline -1)"
  c_yel "回滚命令（如需）: git checkout $OLD_REF && docker compose build && docker compose up -d"
}

# ---------- 4) 应用更新 ----------
step_apply() {
  c_title "4/5 应用更新前检查与备份"
  # 4.1 .env 新变量检查：只对比变量名，绝不打印值、绝不修改 .env
  if [[ ! -f .env ]]; then
    c_red "缺少 .env 文件！无法继续。"; exit 1
  fi
  local missing
  missing=$(comm -23 \
    <(grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env.example | sort -u) \
    <(grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env | sort -u))
  if [[ -n "$missing" ]]; then
    c_yel "注意：.env.example 中存在而 .env 未设置的变量（按需手工补入 .env，勿提交）:"
    echo "$missing" | sed 's/^/    - /'
  else
    c_grn ".env 变量完整（相对 .env.example 无缺失）。"
  fi
  # 4.2 compose 配置校验
  c_yel "docker compose config 校验..."
  docker compose config -q
  c_grn "compose 配置有效。"
  # 4.3 数据库备份（PostgreSQL，凭据只用于连接，不打印）
  mkdir -p "$BACKUP_DIR"
  local stamp dbfile
  stamp="$(date +%Y%m%d-%H%M%S)"
  dbfile="$BACKUP_DIR/newapi-predeploy-$stamp.sql.gz"
  c_yel "部署前数据库备份 → $dbfile"
  if docker compose exec -T postgres pg_dump -U root -d new-api 2>/dev/null | gzip > "$dbfile" \
    && [[ -s "$dbfile" ]]; then
    c_grn "备份完成（$(du -h "$dbfile" | cut -f1)）。"
  else
    c_red "数据库备份失败，为安全起见中止部署。请检查 postgres 容器状态后重试。"
    rm -f "$dbfile"; exit 1
  fi
}

# ---------- 5) 网站更新 ----------
health_check() {
  local ok=1 path code
  for path in /robots.txt /sitemap.xml /og-image.png /; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL$path" || echo 000)
    if [[ "$code" != "200" ]]; then
      c_red "  健康检查失败: $path → HTTP $code"
      ok=0
    else
      c_grn "  OK: $path → 200"
    fi
  done
  # SEO 资产内容抽查（域名不应是 localhost）
  if curl -sf --max-time 10 "$BASE_URL/sitemap.xml" | grep -q 'localhost'; then
    c_red "  警告: /sitemap.xml 中出现 localhost，请检查后台'服务器地址'与 web/site.config.json"
    ok=0
  fi
  return $((1 - ok))
}

step_update() {
  c_title "5/5 网站更新（build + up + 健康检查）"
  docker compose build new-api
  docker compose up -d
  sleep 5
  c_yel "健康检查（$BASE_URL）:"
  if health_check; then
    c_grn "部署成功。当前运行: $(git log --oneline -1)  备份: $BACKUP_DIR"
    c_yel "确认网站无误后，可删除 3 天前的旧备份以节省空间。"
  else
    c_red "健康检查未通过！按以下步骤回滚:"
    cat <<EOF
      1) git checkout $OLD_REF
      2) docker compose build new-api
      3) docker compose up -d
      4) 若怀疑数据问题，用备份恢复:
         gunzip -c $BACKUP_DIR/newapi-predeploy-*.sql.gz | docker compose exec -T postgres psql -U root -d new-api
EOF
    exit 1
  fi
}

case "${1:-deploy}" in
  preview)
    step_review_diff
    TARGET="$(pick_target)"
    c_title "preview 完成"
    c_grn "目标版本: ${TARGET:-（无 aimoxt-* tag）}"
    if [[ -n "${TARGET:-}" ]]; then
      git log --oneline "HEAD..$TARGET^{commit}" | cat || true
    fi
    c_yel "未做任何变更。确认无误后去掉 preview 参数执行正式部署。"
    ;;
  deploy)
    step_review_diff
    step_select
    step_pull
    step_apply
    step_update
    ;;
  *)
    echo "用法: bash scripts/server-deploy.sh [preview|deploy]"; exit 2 ;;
esac
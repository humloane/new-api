#!/usr/bin/env bash
#
# dev-sync-upstream.sh — 开发机同步上游工作流（AIMOXT fork）
#
# 流程（与项目约定的维护策略一致）:
#   1) 审核修改   工作区必须干净（定制代码全部提交后才可同步）
#   2) 选择分支   切到部署分支（默认 main）
#   3) 打保护 tag sync-YYYYMMDD-<sha>（随时可 git reset --hard 回到这里）
#   4) 拉取上游   确保 upstream remote 存在并 fetch
#   5) 审阅差异   列出上游新提交与重点目录/部署文件变更（先"看"再"合"）
#   6) 合并       git merge upstream/main；冲突时列出文件并中止，手工解决后
#                 用 VERIFY_ONLY=1 重跑本脚本继续验证
#   7) 验证       go build / go test / 前端 typecheck+lint+test+build
#   8) 推送       打 aimoxt-* tag 并推送 main 与 tags 到 origin
#
# 用法:
#   bash scripts/dev-sync-upstream.sh            # 完整流程，关键动作前会询问
#   VERIFY_ONLY=1 bash scripts/dev-sync-upstream.sh   # 冲突解决后只跑 7)+8)
#   SKIP_PUSH=1   bash scripts/dev-sync-upstream.sh   # 到验证为止，不推送
#
# 环境变量（可按需覆盖）:
#   BRANCH      部署分支，默认 main
#   UPSTREAM_URL 上游地址，默认 https://github.com/QuantumNous/new-api
#
set -euo pipefail

BRANCH="${BRANCH:-main}"
UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/QuantumNous/new-api}"

# 审阅/合并时需要重点关注的目录（计费、鉴权、协议、部署）
WATCH_DIRS="relay/ relaykit/ service/ model/ middleware/ common/ setting/ router/ .env.example docker-compose.yml Dockerfile"

c_red()   { printf '\033[31m%s\033[0m\n' "$*"; }
c_grn()   { printf '\033[32m%s\033[0m\n' "$*"; }
c_yel()   { printf '\033[33m%s\033[0m\n' "$*"; }
c_title() { printf '\n\033[1m=== %s ===\033[0m\n' "$*"; }

confirm() { # confirm "提示语"  ; 回答 y 才继续
  local ans
  read -r -p "$1 [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]]
}

# ---------- 1) 审核修改 ----------
step_review() {
  c_title "1/8 审核修改（工作区状态）"
  git status --short
  if [[ -n "$(git status --porcelain)" ]]; then
    c_red "工作区不干净。请先提交（或明确放弃）所有定制修改后重跑本脚本。"
    c_red "提示：git add <文件> 精确暂存，不要使用 git add . / git add -A"
    exit 1
  fi
  c_grn "工作区干净。当前 HEAD: $(git log --oneline -1)"
}

# ---------- 2) 选择分支 ----------
step_branch() {
  c_title "2/8 选择分支"
  git checkout "$BRANCH"
  c_grn "当前分支: $(git branch --show-current)"
}

# ---------- 3) 保护 tag ----------
step_tag() {
  c_title "3/8 打同步前保护 tag"
  local tag
  tag="sync-$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
  if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    c_yel "tag 已存在: $tag（跳过）"
  else
    git tag "$tag"
    c_grn "已打 tag: $tag  （回退命令: git reset --hard $tag）"
  fi
}

# ---------- 4) 拉取上游 ----------
step_fetch() {
  c_title "4/8 拉取上游"
  if [[ "$(git remote get-url upstream 2>/dev/null || true)" != "$UPSTREAM_URL" ]]; then
    git remote remove upstream 2>/dev/null || true
    git remote add upstream "$UPSTREAM_URL"
    c_grn "已添加 upstream remote: $UPSTREAM_URL"
  fi
  git fetch upstream --prune
  c_grn "上游最新: $(git log --oneline -1 upstream/main)"
}

# ---------- 5) 审阅差异 ----------
step_triage() {
  c_title "5/8 审阅上游差异（先看清楚，再决定是否合并）"
  local ahead
  ahead=$(git rev-list --count HEAD..upstream/main)
  c_yel "上游领先本地 $ahead 个提交。全部提交清单:"
  git log --oneline --no-merges HEAD..upstream/main | cat
  echo
  c_yel "重点目录 / 部署文件变更:"
  git diff --stat HEAD..upstream/main -- $WATCH_DIRS | cat
  echo
  c_yel "完整变更规模:"
  git diff --stat HEAD..upstream/main | tail -1
  [[ "$ahead" -eq 0 ]] && { c_grn "本地已是最新，无需合并。"; SKIP_PUSH=1; return; }
}

# ---------- 6) 合并 ----------
step_merge() {
  c_title "6/8 合并 upstream/main"
  confirm "确认现在合并 upstream/main 到 $BRANCH？（已打保护 tag，可回退）" || {
    c_yel "已取消合并。可用 SKIP_PUSH=1 稍后再来。"; exit 0;
  }
  if ! git merge --no-edit upstream/main; then
    c_red "存在合并冲突，请手工解决以下文件:"
    git diff --name-only --diff-filter=U | cat
    cat <<'EOF'

冲突解决清单（本项目已知冲突面）:
  a. web/src/i18n/locales/*.json  双方都是新增 key → 取并集，随后:
       cd web && bun run i18n:sync
  b. router/web-router.go        上游 GlobalWebRateLimit 新签名需传 frontendFS，
       把 webMiddleware 数组对应一行适配过去
  c. docker-compose.yml / .env.example  小改并集；上游新增环境变量同步进服务器 .env

解决后执行:
  git add <已解决的文件>
  git commit --no-edit        # 完成 merge 提交
  bash scripts/dev-sync-upstream.sh verify-push   # 继续验证与推送
EOF
    exit 1
  fi
  c_grn "合并成功: $(git log --oneline -1)"
}

# ---------- 7) 验证 ----------
step_verify() {
  c_title "7/8 验证（Go + 前端）"
  c_yel "go build ./..."
  go build ./...
  c_yel "go test ./controller/ ./router/ ./middleware/"
  go test ./controller/ ./router/ ./middleware/ -count=1
  c_yel "gofmt 检查"
  local bad
  bad=$(gofmt -l controller/seo_assets.go controller/seo_assets_test.go middleware/cache.go middleware/cache_test.go router/web-router.go 2>/dev/null || true)
  [[ -n "$bad" ]] && { c_red "gofmt 需要处理: $bad"; exit 1; }
  c_yel "前端 typecheck / test / build"
  (cd web && bun run typecheck && bun run test && bun run build)
  c_yel "前端 lint（警告级：仓库存在与本次改动无关的既有 lint 错误，需人工确认是否新增）"
  if (cd web && bun run lint); then
    c_grn "lint 无错误。"
  else
    c_yel "lint 报告了错误。请对照合并前基线确认是否由本次合并引入；既有问题不阻塞，但不应新增。"
  fi
  c_grn "全部验证通过。"
  c_yel "（可选）本地冒烟：go build -o /tmp/new-api . 后启动并 curl /robots.txt /sitemap.xml 与 6 个收录页"
}

# ---------- 8) 推送 ----------
step_push() {
  c_title "8/8 推送"
  if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
    c_yel "SKIP_PUSH=1，跳过推送。"
    return
  fi
  local tag
  tag="aimoxt-$(date +%Y%m%d)-upstream-$(git rev-parse --short upstream/main)"
  confirm "打 tag $tag 并推送 $BRANCH 与 tags 到 origin？" || {
    c_yel "已跳过推送。之后可手动: git tag $tag && git push origin $BRANCH --tags"; exit 0;
  }
  git tag "$tag"
  git push origin "$BRANCH"
  git push origin --tags
  c_grn "推送完成。服务器侧请运行: bash scripts/server-deploy.sh（目标: $tag）"
}

main() {
  case "${1:-full}" in
    full)
      step_review; step_branch; step_tag; step_fetch; step_triage
      step_merge
      step_verify
      step_push
      ;;
    verify-push)
      step_verify
      step_push
      ;;
    *)
      echo "用法: bash scripts/dev-sync-upstream.sh [full|verify-push]"; exit 2 ;;
  esac
  c_grn "完成。"
}

main "$@"
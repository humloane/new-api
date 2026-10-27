package service

import (
	"fmt"
	"html"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func UnbindAccountOAuth(identity AuthIdentity, providerID int) error {
	enabled := model.AccountLoginMethods{
		Password: common.PasswordLoginEnabled,
		Passkey:  system_setting.PasskeySettingsSnapshot().Enabled,
		WeChat:   common.WeChatAuthEnabled,
	}
	for _, provider := range oauth.GetAllProviders() {
		if !provider.IsEnabled() {
			continue
		}
		if custom, ok := provider.(*oauth.GenericOAuthProvider); ok {
			enabled.CustomProviderIDs = append(enabled.CustomProviderIDs, custom.GetProviderId())
		} else {
			enabled.OAuthColumns = append(enabled.OAuthColumns, provider.ProviderUserIDColumn())
		}
	}
	return model.UnbindUserOAuthForSession(identity, providerID, enabled)
}

// NotifyAccountSecurityChange never includes credentials or tokens. The caller
// records delivery failure independently from the already-committed change.
func NotifyAccountSecurityChange(email, event string) error {
	if email == "" {
		return nil
	}
	subject := common.SystemName + " — 账户安全通知"
	content := common.BuildEmailHTML(common.EmailTemplateOptions{
		Title:   "账户安全通知",
		Intro:   fmt.Sprintf("您的账户安全设置发生了变更：%s。", html.EscapeString(event)),
		Note:    "如果不是本人操作，请立即打开账户安全设置，撤销其他登录会话，并联系管理员。",
		SiteURL: system_setting.ServerAddress,
	})
	return common.SendEmail(subject, email, content)
}

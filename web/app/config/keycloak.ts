export const KEYCLOAK_CONFIG = {
  url: 'http://192.168.1.194:8081', // Keycloak 服务器地址
  realm: 'AI', // Realm 名称
  clientId: 'AI-Client', // Client ID
  clientSecret: 'wp3rYknyomBc1t4ZzM1X1YHqwiMKiXSQ', // Client Secret
}

// 用于类型检查的接口定义
export type KeycloakTokenResponse = {
  access_token: string
  expires_in: number
  refresh_expires_in: number
  refresh_token: string
  token_type: string
  session_state: string
  scope: string
}

// 增强的调试日志函数
export const logKeycloak = (message: string, data?: any): void => {
  // 移除环境检查，强制输出日志
  try {
    console.log(
      `%c[Keycloak Debug]%c ${message}`,
      'background: #4338ca; color: white; padding: 2px 4px; border-radius: 2px;',
      'color: #4338ca; font-weight: bold;',
    )

    if (data) {
      console.log(
        '%c[Keycloak Data]',
        'background: #4338ca; color: white; padding: 2px 4px; border-radius: 2px;',
        data,
      )
    }

    // 如果有错误对象，单独打印以保留堆栈跟踪
    if (data?.error instanceof Error)
      console.error('[Keycloak Error]:', data.error)
  }
  catch (error) {
    // 如果格式化输出失败，回退到基本日志
    console.log('[Keycloak Debug]', message, data || '')
  }
}

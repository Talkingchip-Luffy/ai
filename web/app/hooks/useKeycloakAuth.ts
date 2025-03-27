import { useCallback, useEffect, useState } from 'react'
import { KEYCLOAK_CONFIG, logKeycloak } from '../config/keycloak'

const TOKEN_KEY = 'remember_token'

export const useKeycloakAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAuthSuccess = useCallback((token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    setIsAuthenticated(true)
    setIsLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        logKeycloak('开始检查认证状态', { pathname: window.location.pathname })

        // 检查本地存储中是否有token
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) {
          logKeycloak('找到本地存储的token', {
            token_preview: `${token.substring(0, 20)}...`,
            token_length: token.length,
          })
          handleAuthSuccess(token)
          return
        }

        // 检查URL中是否有认证码
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')

        if (code) {
          setIsLoading(true)
          logKeycloak('检测到认证码，开始处理认证回调', {
            code_preview: `${code.substring(0, 10)}...`,
            code_length: code.length,
          })

          // 构建token请求
          const tokenEndpoint = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`
          const params = new URLSearchParams()
          params.append('grant_type', 'authorization_code')
          params.append('client_id', KEYCLOAK_CONFIG.clientId)
          params.append('client_secret', KEYCLOAK_CONFIG.clientSecret)
          params.append('code', code)
          params.append('redirect_uri', window.location.origin + window.location.pathname)

          logKeycloak('请求token', {
            tokenEndpoint,
            redirect_uri: window.location.origin + window.location.pathname,
            client_id: KEYCLOAK_CONFIG.clientId,
          })

          const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
          })

          const data = await response.json()

          if (!response.ok) {
            logKeycloak('Token请求失败', {
              status: response.status,
              statusText: response.statusText,
              error: data,
            })
            throw new Error(data.error_description || '认证失败')
          }

          logKeycloak('获取token成功', {
            token_type: data.token_type,
            expires_in: data.expires_in,
            token_preview: `${data.access_token.substring(0, 20)}...`,
            token_length: data.access_token.length,
          })

          handleAuthSuccess(data.access_token)

          // 清除URL中的认证参数
          window.history.replaceState({}, '', window.location.pathname)
        }
        else {
          logKeycloak('没有检测到认证码，需要重定向到登录页面')
          const loginUrl = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/auth?client_id=${KEYCLOAK_CONFIG.clientId}&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname)}&response_type=code`

          logKeycloak('重定向到登录页面', { loginUrl })
          window.location.href = loginUrl
        }
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : '认证过程发生未知错误'
        logKeycloak('认证过程发生错误', { error: errorMessage })
        setIsAuthenticated(false)
        setIsLoading(false)
        setError(errorMessage)
      }
    }

    checkAuth()
  }, [handleAuthSuccess])

  return { isAuthenticated, isLoading, error }
}

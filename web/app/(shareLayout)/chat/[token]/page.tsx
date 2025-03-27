'use client'
import React from 'react'
import ChatWithHistoryWrap from '@/app/components/base/chat/chat-with-history'
import { useKeycloakAuth } from '@/app/hooks/useKeycloakAuth'
import { logKeycloak } from '@/app/config/keycloak'

const Chat = () => {
  const { isAuthenticated, isLoading, error } = useKeycloakAuth()

  // 添加调试日志
  React.useEffect(() => {
    logKeycloak('Chat 组件渲染状态', { isAuthenticated, isLoading, error })
  }, [isAuthenticated, isLoading, error])

  // 如果不是认证状态，返回 null，让 useKeycloakAuth 中的重定向逻辑处理
  if (!isAuthenticated)
    return null

  return <ChatWithHistoryWrap />
}

export default React.memo(Chat)

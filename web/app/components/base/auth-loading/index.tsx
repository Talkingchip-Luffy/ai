import React from 'react'

const AuthLoading = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
        <div className="text-sm text-gray-500">正在验证身份...</div>
      </div>
    </div>
  )
}

export default AuthLoading

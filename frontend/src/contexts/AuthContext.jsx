import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('auth_token'))

  // 设置axios默认header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // 验证 token
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('user')
      
      if (!storedToken) {
        setLoading(false)
        return
      }

      try {
        // 验证 token 是否有效
        const response = await axios.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        
        if (response.data.success) {
          setUser(response.data.user)
          setToken(storedToken)
        } else {
          // Token 无效，清除
          logout()
        }
      } catch (error) {
        console.error('Token验证失败:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [])

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('auth_token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}


import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper, TextInput, PasswordInput, Button, Title, Text,
  Container, Group, Anchor, Stack, Alert, Box, Transition
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconLock, IconUser, IconAlertCircle } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const isMobile = useMediaQuery('(max-width: 48em)')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // 验证
    if (!formData.username || !formData.password) {
      setError('用户名和密码不能为空')
      return
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    
    try {
      setLoading(true)
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      
      const response = await axios.post(endpoint, {
        username: formData.username,
        password: formData.password
      })
      
      if (response.data.success) {
        // 使用 AuthContext 的 login 方法更新认证状态
        login(response.data.user, response.data.token)
        
        notifications.show({
          title: '成功',
          message: isLogin ? '登录成功！' : '注册成功！',
          color: 'green'
        })
        
        // 调用成功回调
        if (onLoginSuccess) {
          onLoginSuccess(response.data.user)
        }
        
        // 跳转到书架
        navigate('/reader')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || (isLogin ? '登录失败' : '注册失败')
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({ username: '', password: '', confirmPassword: '' })
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '20px'
      }}
    >
      <Container size={isMobile ? 'xs' : 420} px={isMobile ? 0 : 'md'}>
        <Transition
          mounted={true}
          transition="fade"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <Paper
              radius="md"
              p={isMobile ? 'lg' : 'xl'}
              withBorder
              shadow="xl"
              style={{
                ...styles,
                background: 'rgba(255, 255, 255, 0.98)'
              }}
            >
              <Stack gap={isMobile ? 'md' : 'lg'}>
                {/* Logo 和标题 */}
                <Box style={{ textAlign: 'center' }}>
                  <Text
                    size={isMobile ? '48px' : '64px'}
                    style={{ lineHeight: 1, marginBottom: 12 }}
                  >
                    📚
                  </Text>
                  <Title
                    order={isMobile ? 4 : 2}
                    ta="center"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700
                    }}
                  >
                    {isLogin ? '欢迎回来' : '创建账号'}
                  </Title>
                  <Text c="dimmed" size="sm" ta="center" mt={5}>
                    {isLogin ? '登录您的通用爬虫管理系统' : '注册一个新账号开始使用'}
                  </Text>
                </Box>

                {/* 错误提示 */}
                {error && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="错误"
                    color="red"
                    variant="light"
                  >
                    {error}
                  </Alert>
                )}

                {/* 表单 */}
                <form onSubmit={handleSubmit}>
                  <Stack gap="md">
                    <TextInput
                      label="用户名"
                      placeholder="请输入用户名"
                      leftSection={<IconUser size={16} />}
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      size={isMobile ? 'sm' : 'md'}
                      required
                    />

                    <PasswordInput
                      label="密码"
                      placeholder="请输入密码"
                      leftSection={<IconLock size={16} />}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      size={isMobile ? 'sm' : 'md'}
                      required
                    />

                    {!isLogin && (
                      <PasswordInput
                        label="确认密码"
                        placeholder="请再次输入密码"
                        leftSection={<IconLock size={16} />}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value
                          })
                        }
                        size={isMobile ? 'sm' : 'md'}
                        required
                      />
                    )}

                    <Button
                      type="submit"
                      fullWidth
                      loading={loading}
                      size={isMobile ? 'sm' : 'md'}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        marginTop: 8
                      }}
                    >
                      {isLogin ? '登录' : '注册'}
                    </Button>
                  </Stack>
                </form>

                {/* 切换登录/注册 */}
                <Group justify="center" mt="md">
                  <Text size="sm" c="dimmed">
                    {isLogin ? '还没有账号？' : '已有账号？'}
                  </Text>
                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    onClick={toggleMode}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 600
                    }}
                  >
                    {isLogin ? '立即注册' : '返回登录'}
                  </Anchor>
                </Group>

                {/* 提示信息 */}
                {isLogin && (
                  <Text size="xs" c="dimmed" ta="center" mt="sm">
                    💡 首次使用请运行初始化脚本创建管理员账号
                  </Text>
                )}
              </Stack>
            </Paper>
          )}
        </Transition>
      </Container>
    </Box>
  )
}

export default LoginPage


import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import CrawlerManager from './pages/CrawlerManager'
import ConfigEditorPage from './pages/ConfigEditorPage'
import ConfigWizard from './pages/ConfigWizard'
import NovelReader from './pages/NovelReader'
import TaskManagerPage from './pages/TaskManagerPage'
import mantineTheme from './theme'
import './App.css'
import { Center, Loader } from '@mantine/core'

// 私有路由组件
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    )
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  // 从 localStorage 获取保存的主题，默认为 auto
  const savedColorScheme = localStorage.getItem('mantine-color-scheme') || 'auto'

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme={savedColorScheme}>
      <ModalsProvider>
        <Notifications position="top-right" zIndex={30000} />
        <AuthProvider>
          <Router>
            <Routes>
              {/* 登录页面（公开） */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* 需要认证的路由 */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Navigate to="/reader" replace />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <PrivateRoute>
                    <Layout>
                      <TaskManagerPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/crawler"
                element={
                  <PrivateRoute>
                    <Layout>
                      <CrawlerManager />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/crawler/edit"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ConfigEditorPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/crawler/wizard"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ConfigWizard />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reader"
                element={
                  <PrivateRoute>
                    <Layout>
                      <NovelReader />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reader/:novelId"
                element={
                  <PrivateRoute>
                    <Layout>
                      <NovelReader />
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}

export default App

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { MantineProvider, createTheme } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import Layout from './components/Layout'
import CrawlerManager from './pages/CrawlerManager'
import ConfigEditorPage from './pages/ConfigEditorPage'
import ConfigWizard from './pages/ConfigWizard'
import NovelReader from './pages/NovelReader'
import TaskManagerPage from './pages/TaskManagerPage'
import mantineTheme from './theme'
import './App.css'

function App() {
  // 从 localStorage 获取保存的主题，默认为 auto
  const savedColorScheme = localStorage.getItem('mantine-color-scheme') || 'auto'

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme={savedColorScheme}>
      <ModalsProvider>
        <Notifications position="top-right" zIndex={30000} />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/crawler" replace />} />
              <Route path="/tasks" element={<TaskManagerPage />} />
              <Route path="/crawler" element={<CrawlerManager />} />
              <Route path="/crawler/edit" element={<ConfigEditorPage />} />
              <Route path="/crawler/wizard" element={<ConfigWizard />} />
              <Route path="/reader" element={<NovelReader />} />
              <Route path="/reader/:novelId" element={<NovelReader />} />
            </Routes>
          </Layout>
        </Router>
      </ModalsProvider>
    </MantineProvider>
  )
}

export default App

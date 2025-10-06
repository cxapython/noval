import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Layout from './components/Layout'
import CrawlerManager from './pages/CrawlerManager'
import ConfigEditorPage from './pages/ConfigEditorPage'
import ConfigWizard from './pages/ConfigWizard'
import NovelReader from './pages/NovelReader'
import TaskManagerPage from './pages/TaskManagerPage'
import './App.css'

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4a90e2',
          borderRadius: 8,
          fontSize: 14,
        },
      }}
    >
      <AntApp>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route path="/tasks" element={<TaskManagerPage />} />
              <Route path="/crawler" element={<CrawlerManager />} />
              <Route path="/crawler/edit" element={<ConfigEditorPage />} />
              <Route path="/crawler/wizard" element={<ConfigWizard />} />
              <Route path="/reader" element={<NovelReader />} />
              <Route path="/reader/:novelId" element={<NovelReader />} />
            </Routes>
          </Layout>
        </Router>
      </AntApp>
    </ConfigProvider>
  )
}

export default App

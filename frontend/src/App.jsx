import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Layout from './components/Layout'
import CrawlerManager from './pages/CrawlerManager'
import ConfigEditorPage from './pages/ConfigEditorPage'
import NovelReader from './pages/NovelReader'
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
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/crawler" replace />} />
            <Route path="/crawler" element={<CrawlerManager />} />
            <Route path="/crawler/edit" element={<ConfigEditorPage />} />
            <Route path="/reader" element={<NovelReader />} />
            <Route path="/reader/:novelId" element={<NovelReader />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  )
}

export default App

import { useLocation, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Menu, Typography } from 'antd'
import { SettingOutlined, BookOutlined, GithubOutlined, UnorderedListOutlined } from '@ant-design/icons'

const { Header, Content, Footer } = AntLayout
const { Title } = Typography

function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    {
      key: '/tasks',
      icon: <UnorderedListOutlined />,
      label: '任务管理'
    },
    {
      key: '/crawler',
      icon: <SettingOutlined />,
      label: '爬虫配置'
    },
    {
      key: '/reader',
      icon: <BookOutlined />,
      label: '小说阅读'
    }
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  return (
    <AntLayout>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            📚 小说爬虫管理系统 v2.0.0
          </Title>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname.startsWith('/reader') ? '/reader' : location.pathname.startsWith('/crawler') ? '/crawler' : location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ flex: 1, minWidth: 400, border: 'none' }}
          />
        </div>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#666', fontSize: '20px' }}
        >
          <GithubOutlined />
        </a>
      </Header>

      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 134px)' }}>
        {children}
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fff' }}>
        小说爬虫管理系统 ©2025 | 基于配置驱动的通用爬虫框架
      </Footer>
    </AntLayout>
  )
}

export default Layout

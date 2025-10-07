import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell, Group, Title, ActionIcon, Tabs, Text } from '@mantine/core'
import { IconSettings, IconBook, IconBrandGithub, IconList } from '@tabler/icons-react'

function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  // 确定当前激活的标签
  const getActiveTab = () => {
    if (location.pathname.startsWith('/reader')) return '/reader'
    if (location.pathname.startsWith('/crawler')) return '/crawler'
    if (location.pathname.startsWith('/tasks')) return '/tasks'
    if (location.pathname.startsWith('/demo')) return '/demo'
    return location.pathname
  }

  const handleTabChange = (value) => {
    if (value) {
      navigate(value)
    }
  }

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 50 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Title order={4} c="blue">
              📚 小说爬虫管理系统 v4.0.0
            </Title>
            
            <Tabs 
              value={getActiveTab()} 
              onChange={handleTabChange}
              variant="pills"
              ml="xl"
            >
              <Tabs.List>
                <Tabs.Tab 
                  value="/tasks" 
                  leftSection={<IconList size={16} />}
                >
                  任务管理
                </Tabs.Tab>
                <Tabs.Tab 
                  value="/crawler" 
                  leftSection={<IconSettings size={16} />}
                >
                  爬虫配置
                </Tabs.Tab>
                <Tabs.Tab 
                  value="/reader" 
                  leftSection={<IconBook size={16} />}
                >
                  小说阅读
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>

          <ActionIcon
            component="a"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            color="gray"
            size="lg"
          >
            <IconBrandGithub size={20} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {children}
      </AppShell.Main>

      <AppShell.Footer p="xs">
        <Text ta="center" size="sm" c="dimmed">
          小说爬虫管理系统 ©2025 | 基于配置驱动的通用爬虫框架
        </Text>
      </AppShell.Footer>
    </AppShell>
  )
}

export default Layout

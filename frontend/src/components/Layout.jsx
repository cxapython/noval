import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell, Group, Title, ActionIcon, Tabs, Text, Menu, Tooltip, useMantineColorScheme, useComputedColorScheme } from '@mantine/core'
import { IconSettings, IconBook, IconBrandGithub, IconList, IconSun, IconMoon, IconSunMoon } from '@tabler/icons-react'

function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { setColorScheme, colorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')

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

  const handleColorSchemeChange = (value) => {
    setColorScheme(value)
    localStorage.setItem('mantine-color-scheme', value)
  }

  return (
    <AppShell
      header={{ height: 64 }}
      footer={{ height: 48 }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="xl" justify="space-between">
          <Group gap="xl">
            <Group gap="xs">
              <Text size="24px" style={{ lineHeight: 1 }}>📚</Text>
              <div>
                <Title 
                  order={4} 
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                    letterSpacing: '-0.5px'
                  }}
                >
                  小说爬虫管理系统
                </Title>
                <Text size="10px" c="dimmed" mt={-2}>v4.0.0</Text>
              </div>
            </Group>
            
            <Tabs 
              value={getActiveTab()} 
              onChange={handleTabChange}
              variant="pills"
              ml="md"
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

          <Group gap="xs">
            {/* 主题切换按钮 */}
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <Tooltip label="切换主题">
                  <ActionIcon
                    variant="light"
                    size="lg"
                    radius="md"
                  >
                    {computedColorScheme === 'dark' ? (
                      <IconMoon size={18} />
                    ) : (
                      <IconSun size={18} />
                    )}
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>选择主题</Menu.Label>
                <Menu.Item
                  leftSection={<IconSun size={16} />}
                  onClick={() => handleColorSchemeChange('light')}
                  rightSection={colorScheme === 'light' && '✓'}
                >
                  浅色模式
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconMoon size={16} />}
                  onClick={() => handleColorSchemeChange('dark')}
                  rightSection={colorScheme === 'dark' && '✓'}
                >
                  深色模式
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSunMoon size={16} />}
                  onClick={() => handleColorSchemeChange('auto')}
                  rightSection={colorScheme === 'auto' && '✓'}
                >
                  跟随系统
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <ActionIcon
              component="a"
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              color="gray"
              size="lg"
              radius="md"
            >
              <IconBrandGithub size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {children}
      </AppShell.Main>

      <AppShell.Footer px="xl" py="sm">
        <Text ta="center" size="xs" c="dimmed" fw={500}>
          小说爬虫管理系统 ©2025 | 基于配置驱动的通用爬虫框架 🚀
        </Text>
      </AppShell.Footer>
    </AppShell>
  )
}

export default Layout

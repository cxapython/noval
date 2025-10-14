import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AppShell, Group, Title, ActionIcon, Tabs, Text, Menu, Tooltip, useMantineColorScheme, useComputedColorScheme, Burger, Drawer, Stack, NavLink, Avatar } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { IconSettings, IconBook, IconBrandGithub, IconList, IconSun, IconMoon, IconSunMoon, IconUser, IconLogout } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'

function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { setColorScheme, colorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')
  const [mobileMenuOpened, { toggle: toggleMobileMenu, close: closeMobileMenu }] = useDisclosure()
  
  // 响应式断点
  const isMobile = useMediaQuery('(max-width: 48em)')
  const isTablet = useMediaQuery('(max-width: 62em)')
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
  
  // 移动端导航项点击
  const handleMobileNavClick = (path) => {
    navigate(path)
    closeMobileMenu()
  }

  return (
    <AppShell
      header={{ height: isMobile ? 56 : 64 }}
      footer={{ height: isMobile ? 40 : 48 }}
      padding={isMobile ? 'sm' : 'lg'}
    >
      <AppShell.Header>
        <Group h="100%" px={isMobile ? 'sm' : 'xl'} justify="space-between" wrap="nowrap">
          {/* 左侧：Logo + 标题 + 导航（桌面端） */}
          <Group gap={isMobile ? 'xs' : 'xl'} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            {/* 移动端：Burger 菜单 */}
            {isMobile && (
              <Burger
                opened={mobileMenuOpened}
                onClick={toggleMobileMenu}
                size="sm"
              />
            )}
            
            <Group gap="xs" style={{ minWidth: 0 }}>
              <Text size={isMobile ? '20px' : '24px'} style={{ lineHeight: 1, flexShrink: 0 }}>📚</Text>
              <div style={{ minWidth: 0 }}>
                <Title 
                  order={isMobile ? 6 : 4}
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                    letterSpacing: '-0.5px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {isMobile ? '内容爬虫' : '通用爬虫管理系统'}
                </Title>
                {!isMobile && <Text size="10px" c="dimmed" mt={-2}>v4.0.0</Text>}
              </div>
            </Group>
            
            {/* 桌面端：标签导航 */}
            {!isTablet && (
              <Tabs 
                value={getActiveTab()} 
                onChange={handleTabChange}
                variant="pills"
                color="grape"
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
            )}
          </Group>

          {/* 右侧：主题切换 + 用户菜单 */}
          <Group gap="xs" wrap="nowrap">
            {/* 主题切换按钮 */}
            {!isMobile && (
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
            )}

            {/* 用户菜单 */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon
                  variant="light"
                  size={isMobile ? 'md' : 'lg'}
                  radius="md"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  <IconUser size={isMobile ? 16 : 18} style={{ color: 'white' }} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  <Group gap="xs">
                    <Avatar size={24} radius="xl" color="blue">
                      {user?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Text size="sm" fw={600}>{user?.username}</Text>
                  </Group>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                  color="red"
                >
                  登出
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* 移动端导航抽屉 */}
      <Drawer
        opened={mobileMenuOpened}
        onClose={closeMobileMenu}
        size="70%"
        padding="md"
        title={
          <Group gap="xs">
            <Text size="24px" style={{ lineHeight: 1 }}>📚</Text>
            <Title order={5}>菜单</Title>
          </Group>
        }
      >
        <Stack gap="xs">
          <NavLink
            label="任务管理"
            leftSection={<IconList size={20} />}
            active={getActiveTab() === '/tasks'}
            onClick={() => handleMobileNavClick('/tasks')}
            variant="filled"
          />
          <NavLink
            label="爬虫配置"
            leftSection={<IconSettings size={20} />}
            active={getActiveTab() === '/crawler'}
            onClick={() => handleMobileNavClick('/crawler')}
            variant="filled"
          />
          <NavLink
            label="小说阅读"
            leftSection={<IconBook size={20} />}
            active={getActiveTab() === '/reader'}
            onClick={() => handleMobileNavClick('/reader')}
            variant="filled"
          />
          
          <Menu.Divider my="sm" />
          
          {/* 用户信息和登出 */}
          <Group px="sm" py="xs">
            <Avatar size={32} radius="xl" color="blue">
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={600}>{user?.username}</Text>
              <Text size="xs" c="dimmed">v4.0.0</Text>
            </div>
          </Group>
          
          <NavLink
            label="登出"
            leftSection={<IconLogout size={20} />}
            onClick={() => {
              closeMobileMenu()
              handleLogout()
            }}
            color="red"
          />
        </Stack>
      </Drawer>

      <AppShell.Main>
        {children}
      </AppShell.Main>

      <AppShell.Footer 
        px={isMobile ? 'sm' : 'xl'} 
        py={isMobile ? 'xs' : 'sm'}
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(102, 126, 234, 0.15)',
        }}
      >
        <Text 
          ta="center" 
          size={isMobile ? '10px' : 'xs'} 
          fw={500}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {isMobile ? '通用爬虫 ©2025 🚀' : '通用爬虫管理系统 ©2025 | 基于配置驱动的智能爬虫框架 🚀'}
        </Text>
      </AppShell.Footer>
    </AppShell>
  )
}

export default Layout

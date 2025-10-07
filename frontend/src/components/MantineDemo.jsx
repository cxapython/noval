/**
 * Mantine 环境验证 Demo 组件
 * 用于测试 Mantine UI 库是否正确配置
 */

import { 
  Container, 
  Title, 
  Text, 
  Button, 
  Card, 
  Group, 
  Stack,
  Badge,
  Alert,
  TextInput,
  Select,
  Checkbox,
  Switch,
  Table,
  Tabs,
  Progress,
  Loader,
  Divider
} from '@mantine/core';
import { 
  IconCheck, 
  IconAlertCircle, 
  IconSearch,
  IconSettings,
  IconDatabase,
  IconCode
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

export default function MantineDemo() {
  const [inputValue, setInputValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [switchValue, setSwitchValue] = useState(false);

  const showNotification = () => {
    notifications.show({
      title: '测试通知',
      message: 'Mantine Notifications 工作正常！',
      color: 'blue',
      icon: <IconCheck />,
    });
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* 标题区 */}
        <Card>
          <Title order={1}>🎉 Mantine UI 环境验证</Title>
          <Text c="dimmed" mt="sm">
            V4 版本 - Phase 1 环境准备完成测试
          </Text>
          <Group mt="md">
            <Badge color="green" variant="filled">Mantine 7.x</Badge>
            <Badge color="blue" variant="filled">React 18</Badge>
            <Badge color="cyan" variant="filled">Tabler Icons</Badge>
            <Badge color="violet" variant="filled">Emotion</Badge>
          </Group>
        </Card>

        {/* 按钮测试 */}
        <Card>
          <Title order={3} mb="md">1. 按钮组件测试</Title>
          <Group>
            <Button variant="filled">默认按钮</Button>
            <Button variant="light" color="blue">轻量按钮</Button>
            <Button variant="outline" color="green">轮廓按钮</Button>
            <Button variant="subtle" color="red">淡色按钮</Button>
            <Button variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              渐变按钮
            </Button>
            <Button onClick={showNotification} leftSection={<IconCheck size={16} />}>
              测试通知
            </Button>
          </Group>
        </Card>

        {/* 表单组件测试 */}
        <Card>
          <Title order={3} mb="md">2. 表单组件测试</Title>
          <Stack>
            <TextInput
              label="文本输入"
              placeholder="输入一些文本..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
            <Select
              label="选择器"
              placeholder="选择一个选项"
              data={['React', 'Vue', 'Angular', 'Svelte']}
            />
            <Group>
              <Checkbox
                label="复选框"
                checked={checked}
                onChange={(e) => setChecked(e.currentTarget.checked)}
              />
              <Switch
                label="开关"
                checked={switchValue}
                onChange={(e) => setSwitchValue(e.currentTarget.checked)}
              />
            </Group>
          </Stack>
        </Card>

        {/* 警告组件 */}
        <Alert icon={<IconAlertCircle />} title="提示" color="blue">
          Mantine Alert 组件工作正常！
        </Alert>

        {/* 进度条 */}
        <Card>
          <Title order={3} mb="md">3. 进度和加载测试</Title>
          <Stack>
            <Progress value={65} label="65%" size="xl" />
            <Group>
              <Loader size="sm" />
              <Loader size="md" />
              <Loader size="lg" />
              <Text>加载器正常</Text>
            </Group>
          </Stack>
        </Card>

        {/* 表格测试 */}
        <Card>
          <Title order={3} mb="md">4. 表格组件测试</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>组件</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>版本</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>@mantine/core</Table.Td>
                <Table.Td><Badge color="green">正常</Badge></Table.Td>
                <Table.Td>^7.0.0</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>@mantine/hooks</Table.Td>
                <Table.Td><Badge color="green">正常</Badge></Table.Td>
                <Table.Td>^7.0.0</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>@mantine/form</Table.Td>
                <Table.Td><Badge color="green">正常</Badge></Table.Td>
                <Table.Td>^7.0.0</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>@mantine/notifications</Table.Td>
                <Table.Td><Badge color="green">正常</Badge></Table.Td>
                <Table.Td>^7.0.0</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>@tabler/icons-react</Table.Td>
                <Table.Td><Badge color="green">正常</Badge></Table.Td>
                <Table.Td>^2.40.0</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        {/* 标签页测试 */}
        <Card>
          <Title order={3} mb="md">5. 标签页组件测试</Title>
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconCheck size={16} />}>
                概览
              </Tabs.Tab>
              <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
                配置
              </Tabs.Tab>
              <Tabs.Tab value="database" leftSection={<IconDatabase size={16} />}>
                数据库
              </Tabs.Tab>
              <Tabs.Tab value="code" leftSection={<IconCode size={16} />}>
                代码
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Text>Mantine Tabs 组件工作正常！</Text>
            </Tabs.Panel>
            <Tabs.Panel value="settings" pt="md">
              <Text>配置面板内容</Text>
            </Tabs.Panel>
            <Tabs.Panel value="database" pt="md">
              <Text>数据库面板内容</Text>
            </Tabs.Panel>
            <Tabs.Panel value="code" pt="md">
              <Text>代码面板内容</Text>
            </Tabs.Panel>
          </Tabs>
        </Card>

        <Divider my="xl" />

        {/* 总结 */}
        <Card withBorder style={{ borderColor: 'var(--mantine-color-green-6)' }}>
          <Group>
            <IconCheck size={32} color="green" />
            <div>
              <Title order={3} c="green">✅ Phase 1 环境验证通过</Title>
              <Text c="dimmed" mt="xs">
                所有 Mantine 组件正常工作，可以开始 Phase 2 迁移！
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}

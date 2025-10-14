import { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Group, Stack, Modal, TextInput, NumberInput,
  Switch, Tabs, Progress, Text, Title, Grid, 
  Tooltip, Drawer, Badge, ActionIcon, Select,
  Table as MantineTable, Paper, RingProgress, Center, Box,
  Skeleton, ThemeIcon
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPlayerPlay, IconPlayerStop, IconTrash, IconReload,
  IconPlus, IconEye, IconClock, IconCircleCheck,
  IconCircleX, IconPlayerPause, IconClearAll
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import io from 'socket.io-client';
import { API_BASE_URL, SOCKET_CONFIG } from '../config';

// API基础URL (从配置文件导入)

function TaskManagerPage() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  
  const createForm = useForm({
    initialValues: {
      config_filename: '',
      book_id: '',
      start_url: '',
      max_workers: 5,
      use_proxy: false,
      auto_start: true
    }
  });
  
  const socketRef = useRef(null);
  const logsEndRef = useRef(null);

  // 初始化WebSocket连接
  useEffect(() => {
    console.log('🔌 初始化 WebSocket 连接...');
    console.log('配置:', SOCKET_CONFIG);
    
    // 连接WebSocket
    const socket = io(SOCKET_CONFIG.url, {
      path: SOCKET_CONFIG.path,
      transports: SOCKET_CONFIG.transports,
      reconnection: SOCKET_CONFIG.reconnection,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
      timeout: SOCKET_CONFIG.timeout
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected - 实时连接已建立');
      console.log('   Socket ID:', socket.id);
      console.log('   Transport:', socket.io.engine.transport.name);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected - 实时连接已断开');
      console.log('   原因:', reason);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket 连接错误:', error.message);
    });

    socket.on('reconnect_attempt', () => {
      console.log('🔄 尝试重新连接...');
    });

    // 监听任务进度更新
    socket.on('task_progress', (data) => {
      console.log('📊 Task progress:', data);
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.task_id === data.task_id ? { ...task, ...data.progress } : task
        )
      );
      
      // 如果当前正在查看这个任务的详情，更新selectedTask
      if (selectedTask && selectedTask.task_id === data.task_id) {
        setSelectedTask(prev => ({ ...prev, ...data.progress }));
      }
    });

    // 监听任务日志
    socket.on('task_log', (data) => {
      console.log('📝 Task log:', data);
      if (selectedTask && selectedTask.task_id === data.task_id) {
        setTaskLogs(prev => [...prev, {
          ...data.log,
          timestamp: new Date().toISOString()
        }]);
        // 自动滚动到底部
        setTimeout(() => {
          if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    });

    // 监听任务启动
    socket.on('task_started', (data) => {
      console.log('🚀 Task started:', data);
      notifications.show({
        title: '成功',
        message: `任务已启动: ${data.task_id}`,
        color: 'green'
      });
      fetchTasks();
    });

    // 监听任务停止
    socket.on('task_stopped', (data) => {
      console.log('🛑 Task stopped:', data);
      notifications.show({
        title: '提示',
        message: `任务已停止: ${data.task_id}`,
        color: 'blue'
      });
      fetchTasks();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [selectedTask]);

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/tasks`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      } else {
        notifications.show({
          title: '错误',
          message: `获取任务列表失败: ${data.error}`,
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `获取任务列表失败: ${error.message}`,
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取配置列表
  const fetchConfigs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/configs`);
      const data = await response.json();
      if (data.success) {
        setConfigs(data.configs);
      }
    } catch (error) {
      console.error('获取配置列表失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchTasks();
    fetchConfigs();
    // 每3秒刷新一次任务列表（加快轮询频率，补偿WebSocket可能的断开）
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  // 创建任务
  const handleCreateTask = async (values) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/task/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await response.json();
      
      if (data.success) {
        notifications.show({
          title: '成功',
          message: '任务创建成功',
          color: 'green'
        });
        setCreateModalVisible(false);
        createForm.reset();
        fetchTasks();
        
        // 自动启动任务
        if (values.auto_start) {
          await handleStartTask(data.task_id);
        }
      } else {
        notifications.show({
          title: '错误',
          message: `创建任务失败: ${data.error}`,
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `创建任务失败: ${error.message}`,
        color: 'red'
      });
    }
  };

  // 启动任务
  const handleStartTask = async (task_id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/task/${task_id}/start`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        notifications.show({
          title: '成功',
          message: '任务已启动',
          color: 'green'
        });
        fetchTasks();
      } else {
        notifications.show({
          title: '错误',
          message: `启动任务失败: ${data.error}`,
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `启动任务失败: ${error.message}`,
        color: 'red'
      });
    }
  };

  // 停止任务
  const handleStopTask = async (task_id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/task/${task_id}/stop`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        notifications.show({
          title: '成功',
          message: '任务已停止',
          color: 'green'
        });
        fetchTasks();
      } else {
        notifications.show({
          title: '错误',
          message: `停止任务失败: ${data.error}`,
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `停止任务失败: ${error.message}`,
        color: 'red'
      });
    }
  };

  // 删除任务
  const handleDeleteTask = async (task_id) => {
    modals.openConfirmModal({
      title: '确认删除',
      children: <Text size="sm">确定要删除这个任务吗？</Text>,
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/crawler/task/${task_id}/delete`, {
            method: 'DELETE'
          });
          const data = await response.json();
          
          if (data.success) {
            notifications.show({
              title: '成功',
              message: '任务已删除',
              color: 'green'
            });
            fetchTasks();
          } else {
            notifications.show({
              title: '错误',
              message: `删除任务失败: ${data.error}`,
              color: 'red'
            });
          }
        } catch (error) {
          notifications.show({
            title: '错误',
            message: `删除任务失败: ${error.message}`,
            color: 'red'
          });
        }
      }
    });
  };

  // 查看任务详情
  const handleViewTask = async (task) => {
    setSelectedTask(task);
    setDetailDrawerVisible(true);
    
    // 获取任务日志
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/task/${task.task_id}/logs?limit=500`);
      const data = await response.json();
      if (data.success) {
        setTaskLogs(data.logs);
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `获取日志失败: ${error.message}`,
        color: 'red'
      });
    }
  };

  // 清理已完成任务
  const handleClearCompleted = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/tasks/clear-completed`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        notifications.show({
          title: '成功',
          message: data.message,
          color: 'green'
        });
        fetchTasks();
      } else {
        notifications.show({
          title: '错误',
          message: `清理失败: ${data.error}`,
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `清理失败: ${error.message}`,
        color: 'red'
      });
    }
  };

  // 状态标签渲染
  const renderStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'gray', icon: <IconClock size={14} />, text: '等待中' },
      running: { color: 'blue', icon: <IconPlayerPlay size={14} />, text: '运行中' },
      completed: { color: 'green', icon: <IconCircleCheck size={14} />, text: '已完成' },
      failed: { color: 'red', icon: <IconCircleX size={14} />, text: '失败' },
      stopped: { color: 'orange', icon: <IconPlayerPause size={14} />, text: '已停止' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge 
        color={config.color} 
        leftSection={config.icon}
        variant="light"
      >
        {config.text}
      </Badge>
    );
  };

  // 日志级别颜色
  const getLogColor = (level) => {
    const colors = {
      INFO: '#1890ff',
      SUCCESS: '#52c41a',
      WARNING: '#faad14',
      ERROR: '#f5222d'
    };
    return colors[level] || '#000';
  };

  // 统计信息
  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length
  };

  return (
    <>
      <Box className="fade-in" p="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            {/* 标题和操作栏 */}
            <Group justify="space-between" wrap={isMobile ? 'wrap' : 'nowrap'}>
              <Title order={isMobile ? 4 : 2}>📋 任务管理</Title>
              <Group gap="xs" style={{ flex: isMobile ? '1 1 100%' : 'none', justifyContent: isMobile ? 'stretch' : 'flex-start' }}>
                <Button
                  leftSection={!isMobile && <IconReload size={18} />}
                  onClick={fetchTasks}
                  loading={loading}
                  variant="default"
                  size={isMobile ? 'xs' : 'sm'}
                  fullWidth={isMobile}
                  style={{ flex: isMobile ? 1 : 'none' }}
                >
                  {isMobile ? '刷新' : '刷新'}
                </Button>
                {!isMobile && (
                  <Button
                    leftSection={<IconClearAll size={18} />}
                    onClick={handleClearCompleted}
                    variant="light"
                    color="orange"
                    size="sm"
                  >
                    清理已完成
                  </Button>
                )}
                <Button
                  leftSection={!isMobile && <IconPlus size={18} />}
                  onClick={() => setCreateModalVisible(true)}
                  size={isMobile ? 'xs' : 'sm'}
                  fullWidth={isMobile}
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                  style={{ 
                    flex: isMobile ? 1 : 'none',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {isMobile ? '新建' : '创建任务'}
                </Button>
              </Group>
            </Group>

          {/* 统计卡片 */}
          <Grid gutter={isMobile ? 'xs' : 'md'}>
            <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
              <Paper 
                shadow="sm" 
                p={isMobile ? 'sm' : 'md'} 
                radius="md" 
                withBorder
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.1) 100%)',
                  borderTop: '3px solid #6b7280',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size={isMobile ? 40 : 48} radius="md" variant="light" color="gray">
                    <IconClock size={isMobile ? 20 : 24} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>总任务</Text>
                    <Text size={isMobile ? 'xl' : '28px'} fw={700}>{stats.total}</Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
              <Paper 
                shadow="sm" 
                p={isMobile ? 'sm' : 'md'} 
                radius="md" 
                withBorder
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                  borderTop: '3px solid #3b82f6',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size={isMobile ? 40 : 48} radius="md" variant="light" color="blue">
                    <IconPlayerPlay size={isMobile ? 20 : 24} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>运行中</Text>
                    <Text size={isMobile ? 'xl' : '28px'} fw={700} c="blue">{stats.running}</Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
              <Paper 
                shadow="sm" 
                p={isMobile ? 'sm' : 'md'} 
                radius="md" 
                withBorder
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
                  borderTop: '3px solid #22c55e',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size={isMobile ? 40 : 48} radius="md" variant="light" color="green">
                    <IconCircleCheck size={isMobile ? 20 : 24} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>已完成</Text>
                    <Text size={isMobile ? 'xl' : '28px'} fw={700} c="green">{stats.completed}</Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Paper 
                shadow="sm" 
                p={isMobile ? 'sm' : 'md'} 
                radius="md" 
                withBorder
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  borderTop: '3px solid #ef4444',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size={isMobile ? 40 : 48} radius="md" variant="light" color="red">
                    <IconCircleX size={isMobile ? 20 : 24} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>失败</Text>
                    <Text size={isMobile ? 'xl' : '28px'} fw={700} c="red">{stats.failed}</Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>

          {/* 任务列表 */}
          <Stack gap="md">
            {tasks.length === 0 ? (
              <Center py={80}>
                <Stack align="center" gap="xl">
                  <ThemeIcon 
                    size={140} 
                    radius="xl" 
                    variant="light" 
                    color="blue"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                    }}
                  >
                    <IconPlayerPlay size={70} stroke={1.5} />
                  </ThemeIcon>
                  <Stack align="center" gap="xs">
                    <Title order={3} c="dimmed">还没有运行任务</Title>
                    <Text c="dimmed" size="sm" ta="center">
                      点击"创建任务"按钮，开始您的第一个爬虫任务
                    </Text>
                  </Stack>
                  <Button 
                    size="lg" 
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                    leftSection={<IconPlus size={20} />}
                    onClick={() => setCreateModalVisible(true)}
                    style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                  >
                    创建第一个任务
                  </Button>
                </Stack>
              </Center>
            ) : (
              tasks.map((task) => (
                <Paper key={task.task_id} shadow="xs" p="lg" radius="md" withBorder>
                  <Stack gap="md">
                    {/* 任务标题行 */}
                    <Group justify="space-between">
                      <Group>
                        <div>
                          <Text fw={600} size="lg">{task.novel_title || '获取中...'}</Text>
                          <Text size="sm" c="dimmed">{task.novel_author || ''}</Text>
                        </div>
                        {renderStatusTag(task.status)}
                      </Group>
                      <Group gap="xs">
                        {(task.status === 'pending' || task.status === 'stopped') && (
                          <Tooltip label="启动">
                            <ActionIcon 
                              variant="light" 
                              color="green" 
                              size="lg"
                              onClick={() => handleStartTask(task.task_id)}
                            >
                              <IconPlayerPlay size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {task.status === 'running' && (
                          <Tooltip label="停止">
                            <ActionIcon 
                              variant="light" 
                              color="red" 
                              size="lg"
                              onClick={() => handleStopTask(task.task_id)}
                            >
                              <IconPlayerStop size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="查看详情">
                          <ActionIcon 
                            variant="light" 
                            color="cyan"
                            size="lg"
                            onClick={() => handleViewTask(task)}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {task.status !== 'running' && (
                          <Tooltip label="删除">
                            <ActionIcon 
                              variant="light" 
                              color="red" 
                              size="lg"
                              onClick={() => handleDeleteTask(task.task_id)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>

                    {/* 任务信息 */}
                    <Grid>
                      <Grid.Col span={4}>
                        <Text size="xs" c="dimmed">任务ID</Text>
                        <Text size="sm" style={{ fontFamily: 'monospace' }}>
                          {task.task_id.slice(0, 8)}...
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Text size="xs" c="dimmed">内容ID</Text>
                        <Text size="sm">{task.book_id}</Text>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Text size="xs" c="dimmed">创建时间</Text>
                        <Text size="sm">{new Date(task.create_time).toLocaleString('zh-CN')}</Text>
                      </Grid.Col>
                    </Grid>

                    {/* 进度条 */}
                    <div>
                      <Group justify="space-between" mb={5}>
                        <Text size="sm" c="dimmed">
                          进度：{task.completed_chapters}/{task.total_chapters} 章
                        </Text>
                        <Text size="sm" fw={600}>{task.progress_percent || 0}%</Text>
                      </Group>
                      <Progress 
                        value={task.progress_percent || 0}
                        color={
                          task.status === 'running' ? 'blue' : 
                          task.status === 'completed' ? 'green' : 
                          task.status === 'failed' ? 'red' : 'gray'
                        }
                        size="lg"
                        radius="md"
                        animated={task.status === 'running'}
                      />
                      {task.failed_chapters > 0 && (
                        <Text size="xs" c="red" mt={5}>
                          失败: {task.failed_chapters} 章
                        </Text>
                      )}
                      {/* 显示详细进度信息 */}
                      {task.detail && (
                        <Text size="xs" c="blue" mt={5} lineClamp={1}>
                          {task.detail}
                        </Text>
                      )}
                      {task.current_chapter && (
                        <Text size="xs" c="dimmed" mt={5} lineClamp={1}>
                          当前: {task.current_chapter}
                        </Text>
                      )}
                    </div>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Stack>
      </Card>
      </Box>

      {/* 创建任务对话框 */}
      <Modal
        opened={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          createForm.reset();
        }}
        title="创建新任务"
        size="lg"
        centered
      >
        <form onSubmit={createForm.onSubmit(handleCreateTask)}>
          <Stack gap="md">
            <Select
              label="爬虫配置"
              placeholder="请选择配置文件"
              data={configs.map(config => ({
                value: config.filename,
                label: `${config.name} (${config.filename})`
              }))}
              required
              {...createForm.getInputProps('config_filename')}
            />

            <Tabs defaultValue="book_id">
              <Tabs.List>
                <Tabs.Tab value="book_id">输入内容ID</Tabs.Tab>
                <Tabs.Tab value="start_url">输入完整URL</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="book_id" pt="md">
                <TextInput
                  label="内容ID"
                  placeholder="例如: 41934"
                  {...createForm.getInputProps('book_id')}
                />
              </Tabs.Panel>

              <Tabs.Panel value="start_url" pt="md">
                <TextInput
                  label="完整URL"
                  placeholder="例如: https://m.ikbook8.com/book/41934.html"
                  {...createForm.getInputProps('start_url')}
                />
              </Tabs.Panel>
            </Tabs>

            <NumberInput
              label="并发线程数"
              min={1}
              max={20}
              {...createForm.getInputProps('max_workers')}
            />

            <Switch
              label="使用代理"
              {...createForm.getInputProps('use_proxy', { type: 'checkbox' })}
            />

            <Switch
              label="创建后自动启动"
              {...createForm.getInputProps('auto_start', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="md">
              <Button 
                variant="default" 
                onClick={() => {
                  setCreateModalVisible(false);
                  createForm.reset();
                }}
              >
                取消
              </Button>
              <Button type="submit">
                创建
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* 任务详情抽屉 */}
      <Drawer
        opened={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        title={`任务详情: ${selectedTask?.novel_title || '加载中...'}`}
        position="right"
        size="xl"
        padding="lg"
      >
        {selectedTask && (
          <Stack gap="lg">
            {/* 任务信息 */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
              <Title order={4} mb="md">任务信息</Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">任务ID</Text>
                  <Text size="sm" style={{ fontFamily: 'monospace' }}>
                    {selectedTask.task_id}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">状态</Text>
                  <div>{renderStatusTag(selectedTask.status)}</div>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">内容名称</Text>
                  <Text size="sm" fw={600}>{selectedTask.novel_title || '-'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">作者</Text>
                  <Text size="sm">{selectedTask.novel_author || '-'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">书籍ID</Text>
                  <Text size="sm">{selectedTask.book_id}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">并发数</Text>
                  <Text size="sm">{selectedTask.max_workers}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">创建时间</Text>
                  <Text size="sm">{new Date(selectedTask.create_time).toLocaleString('zh-CN')}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">开始时间</Text>
                  <Text size="sm">
                    {selectedTask.start_time ? new Date(selectedTask.start_time).toLocaleString('zh-CN') : '-'}
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            {/* 进度信息 */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
              <Title order={4} mb="md">进度信息</Title>
              <Progress 
                value={selectedTask.progress_percent || 0}
                color={
                  selectedTask.status === 'running' ? 'blue' : 
                  selectedTask.status === 'completed' ? 'green' : 
                  selectedTask.status === 'failed' ? 'red' : 'gray'
                }
                size="xl"
                radius="md"
                animated={selectedTask.status === 'running'}
              />
              <Grid mt="md">
                <Grid.Col span={4}>
                  <Paper p="sm" radius="md" withBorder style={{ textAlign: 'center' }}>
                    <Text size="xs" c="dimmed">总条目</Text>
                    <Text size="xl" fw={700}>{selectedTask.total_chapters}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Paper p="sm" radius="md" withBorder style={{ textAlign: 'center' }}>
                    <Text size="xs" c="dimmed">已完成</Text>
                    <Text size="xl" fw={700} c="green">{selectedTask.completed_chapters}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Paper p="sm" radius="md" withBorder style={{ textAlign: 'center' }}>
                    <Text size="xs" c="dimmed">失败</Text>
                    <Text size="xl" fw={700} c="red">{selectedTask.failed_chapters}</Text>
                  </Paper>
                </Grid.Col>
              </Grid>
              {/* 显示详细进度信息 */}
              {selectedTask.detail && (
                <Box mt="md">
                  <Text size="xs" c="dimmed">详细进度</Text>
                  <Text size="sm" c="blue" fw={500}>{selectedTask.detail}</Text>
                </Box>
              )}
              {selectedTask.current_chapter && (
                <Box mt="md">
                  <Text size="xs" c="dimmed">当前条目</Text>
                  <Text size="sm">{selectedTask.current_chapter}</Text>
                </Box>
              )}
            </Paper>

            {/* 实时日志 */}
            <Paper shadow="xs" p="md" radius="md" withBorder>
              <Title order={4} mb="md">实时日志</Title>
              <Paper 
                p="md" 
                radius="md"
                withBorder
                bg="dark.8"
                style={{ 
                  height: '400px', 
                  overflowY: 'auto',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '12px'
                }}
              >
                {taskLogs.length > 0 ? (
                  <Stack gap="xs">
                    {taskLogs.map((log, index) => (
                      <div key={index} style={{ color: getLogColor(log.level) }}>
                        <span style={{ opacity: 0.6 }}>
                          {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                        </span>
                        {' '}
                        <span style={{ color: getLogColor(log.level), fontWeight: 'bold' }}>
                          [{log.level}]
                        </span>
                        {' '}
                        {log.message}
                      </div>
                    ))}
                  </Stack>
                ) : (
                  <Center h={300}>
                    <Text c="dimmed">暂无日志</Text>
                  </Center>
                )}
                <div ref={logsEndRef} />
              </Paper>
            </Paper>
          </Stack>
        )}
      </Drawer>
    </>
  );
}

export default TaskManagerPage;


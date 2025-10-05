import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber,
  Switch, Tabs, Progress, Typography, Row, Col, Statistic, message,
  Tooltip, Drawer, List, Badge, Empty
} from 'antd';
import {
  PlayCircleOutlined, StopOutlined, DeleteOutlined, ReloadOutlined,
  PlusOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, PauseCircleOutlined, ClearOutlined
} from '@ant-design/icons';
import io from 'socket.io-client';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// API基础URL
const API_BASE_URL = 'http://localhost:5001';

function TaskManagerPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [configs, setConfigs] = useState([]);
  
  const [createForm] = Form.useForm();
  const socketRef = useRef(null);
  const logsEndRef = useRef(null);

  // 初始化WebSocket连接
  useEffect(() => {
    // 连接WebSocket
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      message.success('实时连接已建立');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      message.warning('实时连接已断开');
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
      message.success(`任务已启动: ${data.task_id}`);
      fetchTasks();
    });

    // 监听任务停止
    socket.on('task_stopped', (data) => {
      console.log('🛑 Task stopped:', data);
      message.info(`任务已停止: ${data.task_id}`);
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
        message.error(`获取任务列表失败: ${data.error}`);
      }
    } catch (error) {
      message.error(`获取任务列表失败: ${error.message}`);
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
    // 每5秒刷新一次任务列表
    const interval = setInterval(fetchTasks, 5000);
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
        message.success('任务创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        fetchTasks();
        
        // 自动启动任务
        if (values.auto_start) {
          await handleStartTask(data.task_id);
        }
      } else {
        message.error(`创建任务失败: ${data.error}`);
      }
    } catch (error) {
      message.error(`创建任务失败: ${error.message}`);
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
        message.success('任务已启动');
        fetchTasks();
      } else {
        message.error(`启动任务失败: ${data.error}`);
      }
    } catch (error) {
      message.error(`启动任务失败: ${error.message}`);
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
        message.success('任务已停止');
        fetchTasks();
      } else {
        message.error(`停止任务失败: ${data.error}`);
      }
    } catch (error) {
      message.error(`停止任务失败: ${error.message}`);
    }
  };

  // 删除任务
  const handleDeleteTask = async (task_id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/crawler/task/${task_id}/delete`, {
            method: 'DELETE'
          });
          const data = await response.json();
          
          if (data.success) {
            message.success('任务已删除');
            fetchTasks();
          } else {
            message.error(`删除任务失败: ${data.error}`);
          }
        } catch (error) {
          message.error(`删除任务失败: ${error.message}`);
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
      message.error(`获取日志失败: ${error.message}`);
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
        message.success(data.message);
        fetchTasks();
      } else {
        message.error(`清理失败: ${data.error}`);
      }
    } catch (error) {
      message.error(`清理失败: ${error.message}`);
    }
  };

  // 状态标签渲染
  const renderStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
      running: { color: 'processing', icon: <PlayCircleOutlined />, text: '运行中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
      stopped: { color: 'warning', icon: <PauseCircleOutlined />, text: '已停止' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
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

  // 表格列定义
  const columns = [
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 120,
      render: (id) => <Text copyable={{ text: id }}>{id.slice(0, 8)}...</Text>
    },
    {
      title: '小说',
      key: 'novel',
      width: 200,
      render: (_, record) => (
        <div>
          <div><strong>{record.novel_title || '获取中...'}</strong></div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.novel_author || ''}</Text>
        </div>
      )
    },
    {
      title: '书籍ID',
      dataIndex: 'book_id',
      key: 'book_id',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => renderStatusTag(status)
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_, record) => (
        <div>
          <Progress 
            percent={record.progress_percent || 0} 
            size="small"
            status={record.status === 'running' ? 'active' : record.status === 'completed' ? 'success' : 'normal'}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.completed_chapters}/{record.total_chapters} 章
            {record.failed_chapters > 0 && <span style={{ color: '#f5222d' }}> ({record.failed_chapters} 失败)</span>}
          </Text>
        </div>
      )
    },
    {
      title: '当前章节',
      dataIndex: 'current_chapter',
      key: 'current_chapter',
      width: 150,
      ellipsis: true
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 150,
      render: (time) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' || record.status === 'stopped' ? (
            <Tooltip title="启动">
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartTask(record.task_id)}
              />
            </Tooltip>
          ) : null}
          
          {record.status === 'running' ? (
            <Tooltip title="停止">
              <Button
                type="default"
                size="small"
                icon={<StopOutlined />}
                danger
                onClick={() => handleStopTask(record.task_id)}
              />
            </Tooltip>
          ) : null}
          
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewTask(record)}
            />
          </Tooltip>
          
          {record.status !== 'running' ? (
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteTask(record.task_id)}
              />
            </Tooltip>
          ) : null}
        </Space>
      )
    }
  ];

  // 统计信息
  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 标题和操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>📋 任务管理</Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTasks}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearCompleted}
          >
            清理已完成
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建任务
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总任务数" value={stats.total} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="运行中" value={stats.running} valueStyle={{ color: '#1890ff' }} prefix={<PlayCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="失败" value={stats.failed} valueStyle={{ color: '#f5222d' }} prefix={<CloseCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 任务列表表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="task_id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个任务`
          }}
        />
      </Card>

      {/* 创建任务对话框 */}
      <Modal
        title="创建新任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{
            max_workers: 5,
            use_proxy: false,
            auto_start: true
          }}
        >
          <Form.Item
            name="config_filename"
            label="爬虫配置"
            rules={[{ required: true, message: '请选择配置文件' }]}
          >
            <select className="ant-input" style={{ width: '100%' }}>
              <option value="">请选择...</option>
              {configs.map(config => (
                <option key={config.filename} value={config.filename}>
                  {config.name} ({config.filename})
                </option>
              ))}
            </select>
          </Form.Item>

          <Tabs defaultActiveKey="1">
            <TabPane tab="输入书籍ID" key="1">
              <Form.Item
                name="book_id"
                label="书籍ID"
                rules={[{ required: true, message: '请输入书籍ID' }]}
              >
                <Input placeholder="例如: 41934" />
              </Form.Item>
            </TabPane>
            <TabPane tab="输入完整URL" key="2">
              <Form.Item
                name="start_url"
                label="完整URL"
                rules={[{ required: true, message: '请输入完整URL' }]}
              >
                <Input placeholder="例如: https://m.ikbook8.com/book/41934.html" />
              </Form.Item>
            </TabPane>
          </Tabs>

          <Form.Item
            name="max_workers"
            label="并发线程数"
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="use_proxy"
            label="使用代理"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="auto_start"
            label="创建后自动启动"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 任务详情抽屉 */}
      <Drawer
        title={`任务详情: ${selectedTask?.novel_title || '加载中...'}`}
        placement="right"
        width={720}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {selectedTask && (
          <div>
            {/* 任务信息 */}
            <Card title="任务信息" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">任务ID:</Text>
                  <div><Text copyable={{ text: selectedTask.task_id }}>{selectedTask.task_id}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">状态:</Text>
                  <div>{renderStatusTag(selectedTask.status)}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">小说名称:</Text>
                  <div><Text strong>{selectedTask.novel_title || '-'}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">作者:</Text>
                  <div><Text>{selectedTask.novel_author || '-'}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">书籍ID:</Text>
                  <div><Text>{selectedTask.book_id}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">并发数:</Text>
                  <div><Text>{selectedTask.max_workers}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">创建时间:</Text>
                  <div><Text>{new Date(selectedTask.create_time).toLocaleString('zh-CN')}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">开始时间:</Text>
                  <div><Text>{selectedTask.start_time ? new Date(selectedTask.start_time).toLocaleString('zh-CN') : '-'}</Text></div>
                </Col>
              </Row>
            </Card>

            {/* 进度信息 */}
            <Card title="进度信息" size="small" style={{ marginBottom: 16 }}>
              <Progress 
                percent={selectedTask.progress_percent || 0} 
                status={selectedTask.status === 'running' ? 'active' : selectedTask.status === 'completed' ? 'success' : 'normal'}
              />
              <Row gutter={[16, 8]} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Statistic title="总章节" value={selectedTask.total_chapters} />
                </Col>
                <Col span={8}>
                  <Statistic title="已完成" value={selectedTask.completed_chapters} valueStyle={{ color: '#52c41a' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="失败" value={selectedTask.failed_chapters} valueStyle={{ color: '#f5222d' }} />
                </Col>
              </Row>
              {selectedTask.current_chapter && (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">当前章节:</Text>
                  <div><Text>{selectedTask.current_chapter}</Text></div>
                </div>
              )}
            </Card>

            {/* 实时日志 */}
            <Card title="实时日志" size="small">
              <div style={{ 
                height: '400px', 
                overflowY: 'auto', 
                backgroundColor: '#1e1e1e', 
                padding: '12px',
                borderRadius: '4px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '12px'
              }}>
                {taskLogs.length > 0 ? (
                  <List
                    dataSource={taskLogs}
                    renderItem={(log) => (
                      <div style={{ marginBottom: '8px', color: getLogColor(log.level) }}>
                        <span style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleTimeString('zh-CN')} </span>
                        <span style={{ color: getLogColor(log.level), fontWeight: 'bold' }}>[{log.level}]</span> {log.message}
                      </div>
                    )}
                  />
                ) : (
                  <Empty description="暂无日志" style={{ color: '#fff' }} />
                )}
                <div ref={logsEndRef} />
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default TaskManagerPage;


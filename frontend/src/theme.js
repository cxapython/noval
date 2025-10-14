/**
 * Mantine 主题配置
 * V4版本 - 现代化UI主题
 * 采用渐变蓝色主题，优雅的阴影和过渡效果
 */

import { createTheme } from '@mantine/core';

const mantineTheme = createTheme({
  primaryColor: 'blue',
  
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  fontFamilyMonospace: 'Monaco, Consolas, "Courier New", monospace',
  
  defaultRadius: 'md',
  
  // 响应式断点配置
  breakpoints: {
    xs: '36em',  // 576px - 手机端
    sm: '48em',  // 768px - 平板竖屏
    md: '62em',  // 992px - 平板横屏
    lg: '75em',  // 1200px - 桌面端
    xl: '88em',  // 1408px - 大屏
  },
  
  // 间距配置（针对小屏幕优化）
  spacing: {
    xs: '0.625rem',  // 10px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.25rem',   // 20px
    xl: '1.5rem',    // 24px
  },
  
  // 自定义颜色方案
  colors: {
    // 现代蓝色渐变
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab'
    ],
  },
  
  // 增强的阴影效果
  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 10px 15px -5px, rgba(0, 0, 0, 0.04) 0px 7px 7px -5px',
    md: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px',
    lg: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 28px 23px -7px, rgba(0, 0, 0, 0.04) 0px 12px 12px -7px',
    xl: '0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 36px 28px -7px, rgba(0, 0, 0, 0.04) 0px 17px 17px -7px',
  },
  
  // 组件样式定制
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: (theme) => ({
        root: {
          transition: 'all 0.3s ease',
          // 移动端增大点击区域
          '@media (max-width: 48em)': {
            minHeight: '44px',
            fontSize: theme.fontSizes.sm,
          },
        },
      }),
      variants: {
        // 新增：磨砂玻璃按钮变体
        glass: (theme) => ({
          root: {
            background: theme.colorScheme === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: theme.colorScheme === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: theme.colorScheme === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            color: theme.colorScheme === 'dark' ? '#fff' : '#333',
            '&:hover': {
              background: theme.colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.9)',
              transform: 'translateY(-2px)',
              boxShadow: theme.colorScheme === 'dark'
                ? '0 12px 40px 0 rgba(0, 0, 0, 0.5)'
                : '0 12px 40px 0 rgba(31, 38, 135, 0.25)',
            },
          },
        }),
        // 新增：新拟态按钮变体
        neumorphic: (theme) => ({
          root: {
            background: theme.colorScheme === 'dark' ? '#2d2d2d' : '#e0e5ec',
            boxShadow: theme.colorScheme === 'dark'
              ? '8px 8px 16px #1a1a1a, -8px -8px 16px #404040'
              : '8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff',
            border: 'none',
            color: theme.colorScheme === 'dark' ? '#fff' : '#333',
            '&:hover': {
              boxShadow: theme.colorScheme === 'dark'
                ? 'inset 8px 8px 16px #1a1a1a, inset -8px -8px 16px #404040'
                : 'inset 8px 8px 16px #a3b1c6, inset -8px -8px 16px #ffffff',
            },
          },
        }),
      },
    },
    
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
    
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    Modal: {
      defaultProps: {
        radius: 'md',
        shadow: 'xl',
        centered: true,
      },
    },
    
    AppShell: {
      defaultProps: {},
      styles: (theme) => ({
        main: {
          // 移动端调整内边距
          '@media (max-width: 48em)': {
            padding: '0.75rem !important',
          },
        },
        header: {
          '@media (max-width: 48em)': {
            padding: '0 0.75rem',
          },
        },
      }),
    },
    
    ActionIcon: {
      defaultProps: {},
      styles: (theme) => ({
        root: {
          // 移动端增大点击区域
          '@media (max-width: 48em)': {
            minWidth: '44px',
            minHeight: '44px',
          },
        },
      }),
    },
    
    Tabs: {
      defaultProps: {},
    },
    
    Badge: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    Alert: {
      defaultProps: {
        radius: 'md',
      },
    },
    
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        withTableBorder: true,
        withColumnBorders: false,
      },
    },
    
    Stepper: {
      defaultProps: {},
    },
  },
  
  // 焦点环样式
  focusRing: 'auto',
  cursorType: 'pointer',
  
  // 其他自定义变量
  other: {
    pageBackground: '#f8f9fa',
    cardHoverShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    
    // 移动端配置
    mobileBreakpoint: '48em',
    tabletBreakpoint: '62em',
    
    // 移动端最小点击区域
    minTouchTarget: '44px',
  }
});

export default mantineTheme;

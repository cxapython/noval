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
          fontWeight: 500,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover:not([data-disabled])': {
            transform: 'translateY(-1px)',
          },
          '&:active:not([data-disabled])': {
            transform: 'translateY(0)',
          }
        }
      })
    },
    
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
      styles: (theme) => ({
        root: {
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : 'rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: theme.colorScheme === 'dark' 
              ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
              : '0 4px 16px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
          }
        }
      })
    },
    
    Input: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        input: {
          borderColor: 'rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          '&:focus': {
            borderColor: '#228be6',
            boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.1)',
          }
        }
      }
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
      styles: {
        content: {
          borderRadius: 12,
          overflow: 'hidden',
        },
        header: {
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '20px 24px',
        },
        body: {
          padding: '24px',
        }
      }
    },
    
    AppShell: {
      styles: (theme) => ({
        header: {
          borderBottom: theme.colorScheme === 'dark' 
            ? '1px solid ' + theme.colors.dark[5]
            : '1px solid rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(10px)',
          backgroundColor: theme.colorScheme === 'dark'
            ? 'rgba(26, 27, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          boxShadow: theme.colorScheme === 'dark'
            ? '0 1px 3px rgba(0, 0, 0, 0.3)'
            : '0 1px 3px rgba(0, 0, 0, 0.05)',
        },
        main: {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : '#f8f9fa',
        },
        footer: {
          borderTop: theme.colorScheme === 'dark'
            ? '1px solid ' + theme.colors.dark[5]
            : '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: theme.colorScheme === 'dark'
            ? 'rgba(26, 27, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
        }
      })
    },
    
    Tabs: {
      styles: {
        tab: {
          fontWeight: 500,
          fontSize: '14px',
          padding: '10px 16px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(34, 139, 230, 0.05)',
          },
          '&[data-active]': {
            fontWeight: 600,
            color: '#228be6',
          }
        }
      }
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
      styles: {
        root: {
          borderWidth: 1,
        }
      }
    },
    
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        withTableBorder: true,
        withColumnBorders: false,
      },
      styles: {
        table: {
          borderRadius: 8,
          overflow: 'hidden',
        }
      }
    },
    
    Stepper: {
      styles: {
        step: {
          transition: 'all 0.2s ease',
        }
      }
    },
  },
  
  // 焦点环样式
  focusRing: 'auto',
  cursorType: 'pointer',
  
  // 其他自定义变量
  other: {
    pageBackground: '#f8f9fa',
    cardHoverShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  }
});

export default mantineTheme;

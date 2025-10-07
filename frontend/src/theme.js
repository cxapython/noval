/**
 * Mantine 主题配置
 * V4版本 - 现代化UI主题
 */

export const theme = {
  // 主色调 - 使用蓝色系
  primaryColor: 'blue',
  
  // 颜色配置
  colors: {
    // 可以自定义颜色
  },
  
  // 字体配置
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'Monaco, Courier, monospace',
  
  // 间距配置
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  
  // 圆角配置
  radius: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '2rem',
  },
  
  // 组件默认属性
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
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
  },
  
  // 其他配置
  defaultRadius: 'md',
  focusRing: 'auto',
  cursorType: 'pointer',
};

export default theme;

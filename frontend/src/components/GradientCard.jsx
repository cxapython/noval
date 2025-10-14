import { Card } from '@mantine/core';

/**
 * 渐变卡片组件 - 美化的卡片样式
 */
function GradientCard({ children, variant = 'default', gradient, ...props }) {
  const gradients = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blue: 'linear-gradient(135deg, #667eea 0%, #4facfe 100%)',
    purple: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    orange: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    green: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    pink: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    fire: 'linear-gradient(135deg, #fa709a 0%, #ffd3a5 100%)',
  };

  const selectedGradient = gradient || gradients[variant];

  return (
    <Card
      {...props}
      style={{
        background: selectedGradient,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        transition: 'all 0.3s ease',
        ...props.style,
      }}
      sx={{
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.5)',
        },
      }}
    >
      {children}
    </Card>
  );
}

export default GradientCard;


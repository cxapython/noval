import { Stepper } from '@mantine/core'

/**
 * 步骤指示器组件（替换 Ant Design Steps）
 */
function StepIndicator({ currentStep }) {
  return (
    <Stepper 
      active={currentStep} 
      style={{ marginBottom: 32 }}
    >
      <Stepper.Step 
        label="小说基本信息" 
        description="配置标题、作者等"
      />
      <Stepper.Step 
        label="章节列表" 
        description="配置章节列表解析"
      />
      <Stepper.Step 
        label="章节内容" 
        description="配置正文内容解析"
      />
      <Stepper.Step 
        label="配置预览" 
        description="预览并保存配置"
      />
    </Stepper>
  )
}

export default StepIndicator

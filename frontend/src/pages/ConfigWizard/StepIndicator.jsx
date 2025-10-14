import { Stepper } from '@mantine/core'
import { STEP_TITLES, STEP_DESCRIPTIONS } from '../../config/contentTypes'

/**
 * 步骤指示器组件 - 支持动态内容类型
 */
function StepIndicator({ currentStep, contentType = 'novel' }) {
  const stepTitles = STEP_TITLES[contentType] || STEP_TITLES.novel
  const stepDescriptions = STEP_DESCRIPTIONS[contentType] || STEP_DESCRIPTIONS.novel

  return (
    <Stepper 
      active={currentStep} 
      style={{ marginBottom: 32 }}
    >
      <Stepper.Step 
        label={stepTitles[0]} 
        description={stepDescriptions[0]}
      />
      <Stepper.Step 
        label={stepTitles[1]} 
        description={stepDescriptions[1]}
      />
      <Stepper.Step 
        label={stepTitles[2]} 
        description={stepDescriptions[2]}
      />
      <Stepper.Step 
        label={stepTitles[3]} 
        description={stepDescriptions[3]}
      />
    </Stepper>
  )
}

export default StepIndicator

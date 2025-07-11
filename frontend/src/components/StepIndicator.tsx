import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Create Project & Upload Template' },
    { number: 2, title: 'Upload Certificate Batch' },
    { number: 3, title: 'Issue Certificates' },
  ];

  const getStepClass = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'step completed';
    if (stepNumber === currentStep) return 'step active';
    return 'step inactive';
  };

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className={getStepClass(step.number)}>
            <div className="step-number">{step.number}</div>
            <span>{step.title}</span>
          </div>
          {index < steps.length - 1 && <div className="step-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator; 
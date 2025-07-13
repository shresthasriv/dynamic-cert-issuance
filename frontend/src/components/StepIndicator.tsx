import React from 'react';
import { Check, ClipboardEdit, UploadCloud, Send } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Create Project', icon: <ClipboardEdit size={14} /> },
    { number: 2, title: 'Upload Batch', icon: <UploadCloud size={14} /> },
    { number: 3, title: 'Issue Certificates', icon: <Send size={14} /> },
  ];

  const getStepClass = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      return 'completed';
    } else if (stepNumber === currentStep) {
      return 'active';
    } else {
      return 'inactive';
    }
  };

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className={`step ${getStepClass(step.number)}`}>
            <div className="step-number">
              {getStepClass(step.number) === 'completed' ? (
                <Check size={16} />
              ) : (
                step.icon
              )}
            </div>
            <div>
              <div className="step-label">Step {step.number}</div>
              <div className="step-title">{step.title}</div>
            </div>
          </div>
          {index < steps.length - 1 && <div className="step-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator; 
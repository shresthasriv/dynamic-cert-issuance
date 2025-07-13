/**
 * StepIndicator.tsx
 * 
 * Visual step indicator component that shows the current progress through the 
 * 3-step certificate issuance process. Provides clear visual feedback about
 * completed, current, and upcoming steps.
 * 
 * Features:
 * - Visual step progression (completed, active, inactive states)
 * - Responsive design with icons and labels
 * - Clear visual hierarchy and status indication
 */
import React from 'react';
import { Check, ClipboardEdit, UploadCloud, Send } from 'lucide-react';

/**
 * Props interface for StepIndicator component
 */
interface StepIndicatorProps {
  /** Current step number (1, 2, or 3) */
  currentStep: number;
}

/**
 * StepIndicator Component
 * 
 * Displays a horizontal step indicator showing the 3-step certificate issuance process:
 * 1. Create Project & Upload Template
 * 2. Upload Batch Files  
 * 3. Issue Certificates
 * 
 * Shows completed steps with checkmarks, current step highlighted, and future steps dimmed.
 */
const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  // Define the steps with their metadata
  const steps = [
    { number: 1, title: 'Create Project', icon: <ClipboardEdit size={14} /> },
    { number: 2, title: 'Upload Batch', icon: <UploadCloud size={14} /> },
    { number: 3, title: 'Issue Certificates', icon: <Send size={14} /> },
  ];

  /**
   * Determines the CSS class for a step based on its completion status
   * 
   * @param {number} stepNumber - The step number to get class for
   * @returns {string} CSS class name for the step state
   */
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
          {/* Individual Step Container */}
          <div className={`step ${getStepClass(step.number)}`}>
            {/* Step Number/Icon Container */}
            <div className="step-number">
              {getStepClass(step.number) === 'completed' ? (
                <Check size={16} />
              ) : (
                step.icon
              )}
            </div>
            {/* Step Labels */}
            <div>
              <div className="step-label">Step {step.number}</div>
              <div className="step-title">{step.title}</div>
            </div>
          </div>
          {/* Divider Line between steps (not after last step) */}
          {index < steps.length - 1 && <div className="step-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator; 
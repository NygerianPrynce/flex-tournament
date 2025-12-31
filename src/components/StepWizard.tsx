import type { ReactNode } from 'react';

interface Step {
  id: string;
  label: string;
}

interface StepWizardProps {
  steps: Step[];
  currentStep: number;
  children: ReactNode;
  onStepClick?: (stepIndex: number) => void;
  canNavigateToStep?: (stepIndex: number) => boolean;
}

export function StepWizard({ steps, currentStep, children, onStepClick, canNavigateToStep }: StepWizardProps) {
  const handleStepClick = (index: number) => {
    if (onStepClick && (canNavigateToStep ? canNavigateToStep(index) : index <= currentStep)) {
      onStepClick(index);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isClickable = onStepClick && (canNavigateToStep ? canNavigateToStep(index) : index <= currentStep);
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => handleStepClick(index)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold transition-all ${
                      index < currentStep
                        ? 'bg-sport-green text-white'
                        : index === currentStep
                        ? 'bg-sport-orange text-white'
                        : 'bg-gray-200 text-gray-600'
                    } ${
                      isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'
                    }`}
                    title={isClickable ? `Go to ${step.label}` : undefined}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-700">{step.label}</div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 w-24 mx-4 self-center -mt-4 ${
                      index < currentStep ? 'bg-sport-green' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="card">
        {children}
      </div>
    </div>
  );
}


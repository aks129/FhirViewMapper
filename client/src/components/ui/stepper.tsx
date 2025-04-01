import React from 'react';
import { cn } from '@/lib/utils';

export interface StepperProps {
  steps: {
    id: string;
    label: string;
  }[];
  currentStep: string;
  className?: string;
}

export const Stepper = ({ steps, currentStep, className }: StepperProps) => {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          
          return (
            <React.Fragment key={step.id}>
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  isActive ? "bg-primary text-primary-foreground" : 
                  isCompleted ? "bg-green-500 text-white" : 
                  "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "h-[2px] flex-1", 
                    index < currentIndex ? "bg-green-500" : 
                    index === currentIndex ? "bg-primary" : 
                    "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-2 text-sm">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          
          return (
            <div 
              key={`label-${step.id}`}
              className={cn(
                "text-center px-1",
                isActive ? "text-primary font-medium" : 
                isCompleted ? "text-green-500 font-medium" : 
                "text-muted-foreground"
              )}
              style={{ width: `${100 / steps.length}%` }}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

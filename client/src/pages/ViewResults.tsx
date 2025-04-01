import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { JsonViewer } from '@/components/ui/json-viewer';
import { TransformationResponse } from '@/lib/types';

interface ViewResultsProps {
  transformationResult?: TransformationResponse;
  onNewTransformation: () => void;
}

const ViewResults: React.FC<ViewResultsProps> = ({
  transformationResult,
  onNewTransformation
}) => {
  const [, navigate] = useLocation();

  // If no transformation result, redirect to step 1
  useEffect(() => {
    if (!transformationResult) {
      navigate('/transform');
    }
  }, [transformationResult, navigate]);

  const handleBack = () => {
    navigate('/transform/transform-profile');
  };

  const handleNewTransformation = () => {
    onNewTransformation();
    navigate('/transform');
  };

  // Define steps for the stepper
  const steps = [
    { id: 'select-implementation-guide', label: 'Select IG' },
    { id: 'select-profile', label: 'Select Profile' },
    { id: 'transform-profile', label: 'Transform' },
    { id: 'view-results', label: 'View Result' }
  ];

  if (!transformationResult) {
    return null;
  }

  return (
    <AppLayout>
      <Stepper 
        steps={steps} 
        currentStep="view-results" 
      />

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">View Definition Result</h2>
          
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Transformation Complete</AlertTitle>
            <AlertDescription className="text-green-700">
              The FHIR Profile has been successfully transformed into a SQL View Definition
            </AlertDescription>
          </Alert>
          
          <div className="mb-6">
            <JsonViewer 
              data={transformationResult.viewDefinition} 
              title="SQL View Definition (FHIR)"
              downloadFileName="view-definition.json"
              height="500px" 
            />
          </div>
          
          <div className="mb-6 border border-muted rounded-md overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b border-muted">
              <h3 className="text-md font-medium">Generated SQL Query</h3>
            </div>
            <div className="p-4 bg-white overflow-auto max-h-[200px]">
              <pre className="text-sm text-neutral-800 font-mono">
                {transformationResult.sqlQuery}
              </pre>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="flex items-center"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleNewTransformation}
              className="flex items-center"
            >
              New Transformation
              <RefreshCw className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ViewResults;

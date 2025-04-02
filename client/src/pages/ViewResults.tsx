import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, RefreshCw, CheckCircle, TableProperties } from 'lucide-react';
import { JsonViewer } from '@/components/ui/json-viewer';
import { SqlExporter } from '@/components/ui/sql-exporter';
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
  const [activeTab, setActiveTab] = useState('full-definition');

  // If no transformation result, redirect to step 1
  useEffect(() => {
    console.log("ViewResults component mounted, transformationResult:", transformationResult);
    if (!transformationResult) {
      console.log("No transformation result, redirecting to start");
      navigate('/transform');
    } else {
      console.log("Showing transformation result:", transformationResult);
    }
  }, [transformationResult, navigate]);
  
  // Generate a flattened view of the view definition
  const flattenedDefinition = useMemo(() => {
    if (!transformationResult?.viewDefinition) return null;
    
    const { viewDefinition } = transformationResult;
    
    // Extract key components for a flattened view
    const flatDefinition = {
      resourceType: viewDefinition.resourceType,
      id: viewDefinition.id,
      name: viewDefinition.name,
      status: viewDefinition.status,
      experimental: viewDefinition.experimental,
      date: viewDefinition.date,
      publisher: viewDefinition.publisher,
      contact: viewDefinition.contact,
      description: viewDefinition.description,
      purpose: viewDefinition.purpose,
      fhirVersion: viewDefinition.fhirVersion,
      kind: viewDefinition.kind,
      code: viewDefinition.code,
      targetProfile: viewDefinition.targetProfile,
      resourceTrigger: viewDefinition.resourceTrigger,
      resourceModel: viewDefinition.resourceModel,
      viewTable: viewDefinition.viewTable,
      definition: {
        resourceType: viewDefinition.definition?.resourceType,
        basedOn: viewDefinition.definition?.basedOn,
        select: [],
        where: []
      }
    };
    
    // Extract only the column names and resource paths
    if (viewDefinition.definition?.select) {
      flatDefinition.definition.select = viewDefinition.definition.select.map((select: any) => ({
        columnName: select.columnName,
        resourcePath: select.resourcePath
      }));
    }
    
    // Extract where conditions
    if (viewDefinition.definition?.where) {
      flatDefinition.definition.where = viewDefinition.definition.where;
    }
    
    return flatDefinition;
  }, [transformationResult]);

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
            <Tabs defaultValue="full-definition" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="full-definition">Full Definition</TabsTrigger>
                <TabsTrigger value="flattened-definition">Flattened Definition</TabsTrigger>
              </TabsList>
              
              <TabsContent value="full-definition" className="mt-0">
                <JsonViewer 
                  data={transformationResult.viewDefinition} 
                  title="Complete View Definition (FHIR)"
                  downloadFileName="view-definition.json"
                  height="500px" 
                />
              </TabsContent>
              
              <TabsContent value="flattened-definition" className="mt-0">
                <div className="flex items-center mb-2 text-muted-foreground">
                  <TableProperties className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">Simplified structure with focus on table schema</span>
                </div>
                <JsonViewer 
                  data={flattenedDefinition} 
                  title="Flattened View Definition"
                  downloadFileName="flattened-view-definition.json"
                  height="500px" 
                />
              </TabsContent>
            </Tabs>
          </div>
          
          <SqlExporter 
            standardSql={transformationResult.sqlQuery}
            platformSql={transformationResult.platformSql}
            className="mb-6"
          />
          
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

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper } from '@/components/ui/stepper';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import LoadingOverlay from '@/components/LoadingOverlay';
import { ImplementationGuide, Profile, TransformationRequest, TransformationResponse } from '@/lib/types';

interface TransformProfileProps {
  implementationGuide?: ImplementationGuide;
  profile?: Profile;
  onSetTransformationOptions: (options: {
    schema: string;
    includeExtensions: boolean;
    normalizeTables: boolean;
  }) => void;
  onTransformationComplete: (result: TransformationResponse) => void;
  transformationOptions?: {
    schema: string;
    includeExtensions: boolean;
    normalizeTables: boolean;
  };
}

const TransformProfile: React.FC<TransformProfileProps> = ({
  implementationGuide,
  profile,
  onSetTransformationOptions,
  onTransformationComplete,
  transformationOptions
}) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [schema, setSchema] = useState('fhir');
  const [includeExtensions, setIncludeExtensions] = useState(true);
  const [normalizeTables, setNormalizeTables] = useState(true);
  const [apiKey, setApiKey] = useState('');

  // If profile is not selected, redirect to previous step
  useEffect(() => {
    if (!profile) {
      navigate('/transform/select-profile');
    }
  }, [profile, navigate]);

  // Initialize transformation options from props
  useEffect(() => {
    if (transformationOptions) {
      setSchema(transformationOptions.schema);
      setIncludeExtensions(transformationOptions.includeExtensions);
      setNormalizeTables(transformationOptions.normalizeTables);
    }
  }, [transformationOptions]);

  // Transform mutation
  const transformMutation = useMutation({
    mutationFn: async (data: TransformationRequest) => {
      const response = await apiRequest('POST', `/api/profiles/${profile.id}/transform`, data);
      return response.json();
    },
    onSuccess: (data: TransformationResponse) => {
      // Update transformation options in parent component
      onSetTransformationOptions({
        schema,
        includeExtensions,
        normalizeTables
      });

      // Pass transformation result to parent
      onTransformationComplete(data);

      // Navigate to results page
      navigate('/transform/view-results');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Transformation failed',
        description: error.message || 'An unexpected error occurred',
      });
    }
  });

  const handleBack = () => {
    navigate('/transform/select-profile');
  };

  const handleTransform = () => {
    if (!apiKey) {
      toast({
        variant: 'destructive',
        title: 'API Key Required',
        description: 'Please enter your Claude API key to continue.',
      });
      return;
    }

    // Save transformation options
    onSetTransformationOptions({
      schema,
      includeExtensions,
      normalizeTables
    });

    // Transform profile
    transformMutation.mutate({
      schema,
      includeExtensions,
      normalizeTables,
      apiKey
    });
  };

  // Define steps for the stepper
  const steps = [
    { id: 'select-implementation-guide', label: 'Select IG' },
    { id: 'select-profile', label: 'Select Profile' },
    { id: 'transform-profile', label: 'Transform' },
    { id: 'view-results', label: 'View Result' }
  ];

  return (
    <AppLayout>
      <Stepper 
        steps={steps} 
        currentStep="transform-profile" 
      />

      <LoadingOverlay 
        isVisible={transformMutation.isPending} 
        message="Transforming FHIR profile to SQL View Definition. This may take a moment." 
      />

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Transform to SQL View Definition</h2>
          
          <div className="space-y-6">
            <div className="mb-6">
              <div className="bg-muted rounded-md p-4 mb-4">
                <h3 className="text-md font-medium mb-2">Selected Profile</h3>
                <p className="text-sm">
                  {profile?.name} ({profile?.version || 'N/A'})
                </p>
                <p className="text-sm text-primary mt-1">
                  {profile?.url}
                </p>
              </div>
              
              <div className="bg-muted rounded-md p-4">
                <h3 className="text-md font-medium mb-2">SQL on FHIR Configuration</h3>
                
                <div className="mb-4">
                  <Label htmlFor="schema-name">Schema Name</Label>
                  <Input 
                    id="schema-name" 
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Database schema name for SQL views
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-extensions" 
                        checked={includeExtensions}
                        onCheckedChange={(checked) => setIncludeExtensions(checked === true)}
                      />
                      <Label 
                        htmlFor="include-extensions"
                        className="text-sm font-normal"
                      >
                        Include Extensions
                      </Label>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="normalize-tables" 
                        checked={normalizeTables}
                        onCheckedChange={(checked) => setNormalizeTables(checked === true)}
                      />
                      <Label 
                        htmlFor="normalize-tables"
                        className="text-sm font-normal"
                      >
                        Normalize Tables
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="claude-api-key">Claude API Key</Label>
              <Input
                id="claude-api-key"
                type="password"
                placeholder="Enter your Claude API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Your API key is required to use Claude AI for transformation. It's never stored on our servers.
              </p>
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
                onClick={handleTransform}
                disabled={!apiKey || !schema}
                className="flex items-center"
              >
                Transform
                <Wand2 className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TransformProfile;

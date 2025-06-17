import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ColumnBuilder } from '@/pages/ColumnBuilder';
import { ViewDefinitionViewer } from '@/pages/ViewDefinitionViewer';
import { useQuery } from '@tanstack/react-query';
import { ImplementationGuide, Profile } from '@/lib/types';

export const InteractiveBuilder: React.FC = () => {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'setup' | 'build' | 'view'>('setup');
  const [selectedGuide, setSelectedGuide] = useState<ImplementationGuide | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [viewDefinition, setViewDefinition] = useState<any>(null);
  const [executionResults, setExecutionResults] = useState<any>(null);

  // Fetch implementation guides
  const { data: guides } = useQuery<ImplementationGuide[]>({
    queryKey: ['/api/implementation-guides'],
  });

  // Fetch resource types for selected guide
  const { data: resourceTypes } = useQuery<string[]>({
    queryKey: ['/api/implementation-guides', selectedGuide?.id, 'resource-types'],
    enabled: !!selectedGuide,
  });

  // Fetch profiles for selected resource type
  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ['/api/implementation-guides', selectedGuide?.id, 'resource-types', selectedResourceType, 'profiles'],
    enabled: !!selectedGuide && !!selectedResourceType,
  });

  const handleGuideSelect = (guideId: string) => {
    const guide = guides?.find((g: ImplementationGuide) => g.id.toString() === guideId);
    setSelectedGuide(guide || null);
    setSelectedResourceType('');
    setSelectedProfile(null);
  };

  const handleResourceTypeSelect = (resourceType: string) => {
    setSelectedResourceType(resourceType);
    setSelectedProfile(null);
  };

  const handleProfileSelect = (profileId: string) => {
    const profile = profiles?.find((p: Profile) => p.id.toString() === profileId);
    setSelectedProfile(profile || null);
  };

  const handleStartBuilding = () => {
    if (selectedProfile) {
      setStep('build');
    }
  };

  const handleGenerateViewDefinition = (viewDef: any) => {
    setViewDefinition(viewDef);
    setStep('view');
  };

  const handleExecuteViewDefinition = async (viewDef: any) => {
    try {
      const response = await fetch('/api/execute-viewdefinition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          viewDefinition: viewDef,
          resourceType: selectedProfile?.resourceType || 'Patient'
        }),
      });

      const result = await response.json();
      setExecutionResults(result);
    } catch (error) {
      setExecutionResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleBackToHome = () => {
    setLocation('/');
  };

  const handleBackToSetup = () => {
    setStep('setup');
    setViewDefinition(null);
    setExecutionResults(null);
  };

  const handleBackToBuild = () => {
    setStep('build');
    setExecutionResults(null);
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interactive ViewDefinition Builder</h1>
          <p className="text-muted-foreground mt-2">
            Select an Implementation Guide and Profile to start building your ViewDefinition
          </p>
        </div>
        <Button variant="outline" onClick={handleBackToHome}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Setup Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Implementation Guide Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Implementation Guide</label>
            <Select onValueChange={handleGuideSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select an Implementation Guide" />
              </SelectTrigger>
              <SelectContent>
                {guides?.map((guide: ImplementationGuide) => (
                  <SelectItem key={guide.id} value={guide.id.toString()}>
                    {guide.name} v{guide.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Selection */}
          {selectedGuide && (
            <div>
              <label className="text-sm font-medium mb-2 block">Resource Type</label>
              <Select onValueChange={handleResourceTypeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resource type" />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes?.map((resourceType: string) => (
                    <SelectItem key={resourceType} value={resourceType}>
                      {resourceType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Profile Selection */}
          {selectedResourceType && (
            <div>
              <label className="text-sm font-medium mb-2 block">Profile</label>
              <Select onValueChange={handleProfileSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile: Profile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Configuration Summary */}
          {selectedProfile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Selected Configuration</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Guide</Badge>
                  <span className="text-sm">{selectedGuide?.name} v{selectedGuide?.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Type</Badge>
                  <span className="text-sm">{selectedResourceType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Profile</Badge>
                  <span className="text-sm">{selectedProfile.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleStartBuilding}
              disabled={!selectedProfile}
              size="lg"
            >
              Start Building Columns
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBuildStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Build Your ViewDefinition</h1>
          <p className="text-muted-foreground mt-2">
            Configure columns and filters for {selectedProfile?.name}
          </p>
        </div>
        <Button variant="outline" onClick={handleBackToSetup}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Setup
        </Button>
      </div>

      <ColumnBuilder
        implementationGuide={selectedGuide!}
        profile={selectedProfile!}
        onGenerateViewDefinition={handleGenerateViewDefinition}
      />
    </div>
  );

  const renderViewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ViewDefinition Results</h1>
          <p className="text-muted-foreground mt-2">
            Review and test your generated ViewDefinition
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackToBuild}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
          <Button variant="outline" onClick={handleBackToSetup}>
            New ViewDefinition
          </Button>
        </div>
      </div>

      <ViewDefinitionViewer
        viewDefinition={viewDefinition}
        onExecuteView={handleExecuteViewDefinition}
        onNewViewDefinition={handleBackToSetup}
        executionResults={executionResults}
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {step === 'setup' && renderSetupStep()}
        {step === 'build' && renderBuildStep()}
        {step === 'view' && renderViewStep()}
      </div>
    </AppLayout>
  );
};
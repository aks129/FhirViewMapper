import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ImplementationGuide, Profile } from '@/lib/types';

interface SelectProfileProps {
  implementationGuide?: ImplementationGuide;
  onSelectResourceType: (resourceType: string) => void;
  onSelectProfile: (profile: Profile) => void;
  selectedResourceType?: string;
  selectedProfile?: Profile;
}

const SelectProfile: React.FC<SelectProfileProps> = ({
  implementationGuide,
  onSelectResourceType,
  onSelectProfile,
  selectedResourceType,
  selectedProfile
}) => {
  const [, navigate] = useLocation();
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  // If no implementation guide is selected, redirect to step 1
  useEffect(() => {
    if (!implementationGuide) {
      navigate('/transform');
    }
  }, [implementationGuide, navigate]);

  // Fetch resource types for the implementation guide
  const { data: resourceTypes, isLoading: isLoadingResourceTypes } = useQuery({
    queryKey: [implementationGuide ? `/api/implementation-guides/${implementationGuide.id}/resource-types` : null],
    enabled: !!implementationGuide
  });

  // Fetch profiles for the selected resource type
  const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: [
      implementationGuide && selectedResourceType
        ? `/api/implementation-guides/${implementationGuide.id}/resource-types/${selectedResourceType}/profiles`
        : null
    ],
    enabled: !!implementationGuide && !!selectedResourceType
  });

  // Update profile details visibility
  useEffect(() => {
    setShowProfileDetails(!!selectedProfile);
  }, [selectedProfile]);

  // Handle resource type selection
  const handleResourceTypeChange = (value: string) => {
    onSelectResourceType(value);
    onSelectProfile(undefined);
    setShowProfileDetails(false);
  };

  // Handle profile selection
  const handleProfileChange = (value: string) => {
    const profile = profiles.find((p: Profile) => p.id.toString() === value);
    if (profile) {
      onSelectProfile(profile);
      setShowProfileDetails(true);
    }
  };

  const handleBack = () => {
    navigate('/transform');
  };

  const handleNext = () => {
    navigate('/transform/transform-profile');
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
        currentStep="select-profile" 
      />

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Select Profile</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resource-type">Resource Type</Label>
              <Select
                disabled={isLoadingResourceTypes || !resourceTypes}
                value={selectedResourceType}
                onValueChange={handleResourceTypeChange}
              >
                <SelectTrigger id="resource-type">
                  <SelectValue placeholder="Select a resource type" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingResourceTypes ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : resourceTypes && resourceTypes.length > 0 ? (
                    resourceTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No resource types available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-select">Available Profiles</Label>
              <Select
                disabled={isLoadingProfiles || !profiles || !selectedResourceType}
                value={selectedProfile?.id.toString()}
                onValueChange={handleProfileChange}
              >
                <SelectTrigger id="profile-select">
                  <SelectValue placeholder={selectedResourceType ? "Select a profile" : "First select a resource type"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingProfiles ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : !selectedResourceType ? (
                    <SelectItem value="none" disabled>First select a resource type</SelectItem>
                  ) : profiles && profiles.length > 0 ? (
                    profiles.map((profile: Profile) => (
                      <SelectItem key={profile.id} value={profile.id.toString()}>
                        {profile.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No profiles available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {showProfileDetails && selectedProfile && (
              <div className="mb-6">
                <h3 className="text-md font-medium mb-2">Profile Details</h3>
                <div className="bg-muted rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-sm text-muted-foreground">Name:</span>
                      <span className="block text-sm font-medium">{selectedProfile.name}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-muted-foreground">Version:</span>
                      <span className="block text-sm font-medium">{selectedProfile.version || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-muted-foreground">URL:</span>
                      <span className="block text-sm font-medium text-primary overflow-hidden text-ellipsis">
                        {selectedProfile.url}
                      </span>
                    </div>
                    <div>
                      <span className="block text-sm text-muted-foreground">Status:</span>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                onClick={handleNext}
                disabled={!selectedProfile}
                className="flex items-center"
              >
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default SelectProfile;

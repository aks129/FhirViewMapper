import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowRight } from 'lucide-react';
import { ImplementationGuide } from '@/lib/types';

interface SelectImplementationGuideProps {
  onSelect: (guide: ImplementationGuide) => void;
  selectedGuide?: ImplementationGuide;
}

const SelectImplementationGuide: React.FC<SelectImplementationGuideProps> = ({ 
  onSelect, 
  selectedGuide 
}) => {
  const [, navigate] = useLocation();
  
  // Fetch available Implementation Guides
  const { data: guides, isLoading, isError } = useQuery({
    queryKey: ['/api/implementation-guides'],
  });

  // Set US Core as default if available and none is selected
  useEffect(() => {
    if (!selectedGuide && guides && guides.length > 0) {
      // Find US Core guide
      const usCore = guides.find((guide: ImplementationGuide) => 
        guide.name.toLowerCase().includes('us core')
      );
      
      if (usCore) {
        onSelect(usCore);
      }
    }
  }, [guides, selectedGuide, onSelect]);

  const handleNext = () => {
    navigate('/transform/select-profile');
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
        currentStep="select-implementation-guide" 
      />

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Select Implementation Guide</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="implementation-guide">Implementation Guide</Label>
              <Select
                disabled={isLoading || isError}
                value={selectedGuide?.id.toString()}
                onValueChange={(value) => {
                  const selectedGuide = guides.find(
                    (guide: ImplementationGuide) => guide.id.toString() === value
                  );
                  if (selectedGuide) {
                    onSelect(selectedGuide);
                  }
                }}
              >
                <SelectTrigger id="implementation-guide">
                  <SelectValue placeholder="Select an implementation guide" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : isError ? (
                    <SelectItem value="error" disabled>Error loading guides</SelectItem>
                  ) : (
                    guides.map((guide: ImplementationGuide) => (
                      <SelectItem key={guide.id} value={guide.id.toString()}>
                        {guide.name} (v{guide.version})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Currently supporting US Core Implementation Guide v5.0.1
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-url">Implementation Guide URL</Label>
              <Input
                id="guide-url"
                value={selectedGuide?.url || ''}
                readOnly
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground mt-1">
                The official URL for the selected Implementation Guide
              </p>
            </div>

            {selectedGuide?.description && (
              <div className="bg-muted rounded-md p-4">
                <h3 className="text-sm font-medium mb-1">Description</h3>
                <p className="text-sm">{selectedGuide.description}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={handleNext}
                disabled={!selectedGuide}
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

export default SelectImplementationGuide;

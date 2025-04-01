import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useState } from "react";
import { TransformerState, ImplementationGuide, Profile, TransformationResponse } from "@/lib/types";
import SelectImplementationGuide from "@/pages/SelectImplementationGuide";
import SelectProfile from "@/pages/SelectProfile";
import TransformProfile from "@/pages/TransformProfile";
import ViewResults from "@/pages/ViewResults";

function Router() {
  // State for the wizard
  const [transformerState, setTransformerState] = useState<TransformerState>({});

  const handleSelectImplementationGuide = (guide: ImplementationGuide) => {
    setTransformerState(prev => ({
      ...prev,
      implementationGuide: guide,
    }));
  };

  const handleSelectResourceType = (resourceType: string) => {
    setTransformerState(prev => ({
      ...prev,
      resourceType,
    }));
  };

  const handleSelectProfile = (profile: Profile) => {
    setTransformerState(prev => ({
      ...prev,
      profile,
    }));
  };

  const handleSetTransformationOptions = (options: {
    schema: string;
    includeExtensions: boolean;
    normalizeTables: boolean;
  }) => {
    setTransformerState(prev => ({
      ...prev,
      transformationOptions: options,
    }));
  };

  const handleTransformationComplete = (result: TransformationResponse) => {
    console.log("handleTransformationComplete called with result:", result);
    setTransformerState(prevState => {
      const newState = {
        ...prevState,
        transformationResult: result,
      };
      console.log("Updating transformer state:", newState);
      return newState;
    });
  };

  const handleNewTransformation = () => {
    setTransformerState({
      implementationGuide: transformerState.implementationGuide,
    });
  };

  return (
    <Switch>
      <Route path="/" component={Home} />
      
      <Route path="/transform">
        <SelectImplementationGuide 
          onSelect={handleSelectImplementationGuide}
          selectedGuide={transformerState.implementationGuide}
        />
      </Route>
      
      <Route path="/transform/select-profile">
        <SelectProfile 
          implementationGuide={transformerState.implementationGuide}
          onSelectResourceType={handleSelectResourceType}
          onSelectProfile={handleSelectProfile}
          selectedResourceType={transformerState.resourceType}
          selectedProfile={transformerState.profile}
        />
      </Route>
      
      <Route path="/transform/transform-profile">
        <TransformProfile 
          implementationGuide={transformerState.implementationGuide}
          profile={transformerState.profile}
          onSetTransformationOptions={handleSetTransformationOptions}
          onTransformationComplete={handleTransformationComplete}
          transformationOptions={transformerState.transformationOptions}
        />
      </Route>
      
      <Route path="/transform/view-results">
        <ViewResults 
          transformationResult={transformerState.transformationResult}
          onNewTransformation={handleNewTransformation}
        />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

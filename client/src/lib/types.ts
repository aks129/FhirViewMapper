// FHIR types
export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    profile?: string[];
  };
  [key: string]: any;
}

export interface ImplementationGuide {
  id: number;
  name: string;
  version: string;
  url: string;
  description?: string;
}

export interface Profile {
  id: number;
  implementationGuideId: number;
  resourceType: string;
  name: string;
  url: string;
  version?: string;
  description?: string;
  structureDefinition?: any;
}

export interface Transformation {
  id: number;
  profileId: number;
  schema: string;
  includeExtensions: string;
  normalizeTables: string;
  viewDefinition: any;
  sqlQuery: string;
  createdAt: Date;
}

export interface TransformationRequest {
  schema: string;
  includeExtensions: boolean;
  normalizeTables: boolean;
  apiKey?: string;
}

export interface TransformationResponse {
  transformationId: number;
  viewDefinition: any;
  sqlQuery: string;
}

// Wizard state types
export interface TransformerState {
  implementationGuide?: ImplementationGuide;
  resourceType?: string;
  profile?: Profile;
  transformationOptions?: {
    schema: string;
    includeExtensions: boolean;
    normalizeTables: boolean;
  };
  transformationResult?: TransformationResponse;
}

// Step types for the wizard
export type WizardStep = 
  | 'select-implementation-guide'
  | 'select-profile'
  | 'transform-profile'
  | 'view-results';

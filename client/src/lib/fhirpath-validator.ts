/**
 * FHIRPath validation and auto-completion utilities
 */

export interface FHIRPathValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

export interface FHIRPathSuggestion {
  path: string;
  description: string;
  type: string;
  examples?: string[];
}

// Common FHIR resource paths and their descriptions
const PATIENT_PATHS: FHIRPathSuggestion[] = [
  { path: 'id', description: 'Resource identifier', type: 'id' },
  { path: 'active', description: 'Whether this patient record is active', type: 'boolean' },
  { path: 'name', description: 'Patient name', type: 'HumanName[]' },
  { path: 'name.family', description: 'Family name (surname)', type: 'string[]' },
  { path: 'name.given', description: 'Given names', type: 'string[]' },
  { path: 'name.use', description: 'Name use (usual, official, temp, etc.)', type: 'code' },
  { path: 'name.where(use = \'official\').family.first()', description: 'Official family name', type: 'string', examples: ['Smith', 'Johnson'] },
  { path: 'name.where(use = \'official\').given.first()', description: 'Official given name', type: 'string', examples: ['John', 'Jane'] },
  { path: 'telecom', description: 'Contact details', type: 'ContactPoint[]' },
  { path: 'telecom.value', description: 'Contact value (phone, email)', type: 'string' },
  { path: 'telecom.system', description: 'Contact system (phone, email, etc.)', type: 'code' },
  { path: 'telecom.use', description: 'Contact use (home, work, mobile)', type: 'code' },
  { path: 'gender', description: 'Administrative gender', type: 'code', examples: ['male', 'female', 'other', 'unknown'] },
  { path: 'birthDate', description: 'Date of birth', type: 'date' },
  { path: 'deceased', description: 'Indicates if patient is deceased', type: 'boolean|dateTime' },
  { path: 'address', description: 'Patient address', type: 'Address[]' },
  { path: 'address.line', description: 'Street address lines', type: 'string[]' },
  { path: 'address.city', description: 'City name', type: 'string' },
  { path: 'address.state', description: 'State or province', type: 'string' },
  { path: 'address.postalCode', description: 'Postal/ZIP code', type: 'string' },
  { path: 'address.country', description: 'Country', type: 'string' },
  { path: 'maritalStatus', description: 'Marital status', type: 'CodeableConcept' },
  { path: 'communication', description: 'Language communication', type: 'BackboneElement[]' },
  { path: 'communication.language', description: 'Communication language', type: 'CodeableConcept' },
  { path: 'identifier', description: 'Patient identifiers', type: 'Identifier[]' },
  { path: 'identifier.value', description: 'Identifier value', type: 'string' },
  { path: 'identifier.system', description: 'Identifier system/namespace', type: 'uri' },
  { path: 'identifier.type', description: 'Identifier type', type: 'CodeableConcept' },
  { path: 'meta.profile', description: 'Profiles this resource claims to conform to', type: 'canonical[]' },
  { path: 'meta.profile.where($this = \'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient\').exists()', description: 'Filter for US Core patients', type: 'boolean' }
];

const OBSERVATION_PATHS: FHIRPathSuggestion[] = [
  { path: 'id', description: 'Resource identifier', type: 'id' },
  { path: 'status', description: 'Observation status', type: 'code', examples: ['registered', 'preliminary', 'final', 'amended'] },
  { path: 'category', description: 'Classification of observation', type: 'CodeableConcept[]' },
  { path: 'code', description: 'Type of observation', type: 'CodeableConcept' },
  { path: 'code.coding', description: 'Code defined by terminology system', type: 'Coding[]' },
  { path: 'code.coding.system', description: 'Terminology system identifier', type: 'uri' },
  { path: 'code.coding.code', description: 'Symbol in syntax defined by system', type: 'code' },
  { path: 'code.coding.display', description: 'Representation defined by system', type: 'string' },
  { path: 'code.coding.where(system = \'http://loinc.org\').code.first()', description: 'LOINC code', type: 'code' },
  { path: 'subject', description: 'Who/what this observation is about', type: 'Reference' },
  { path: 'encounter', description: 'Healthcare event during which observation was made', type: 'Reference' },
  { path: 'effective', description: 'Clinically relevant time/time-period', type: 'dateTime|Period' },
  { path: 'issued', description: 'Date/time this version was made available', type: 'instant' },
  { path: 'performer', description: 'Who is responsible for the observation', type: 'Reference[]' },
  { path: 'value', description: 'Actual result', type: 'Quantity|CodeableConcept|string|boolean|integer|Range|Ratio|SampledData|time|dateTime|Period' },
  { path: 'valueQuantity', description: 'Numerical result with units', type: 'Quantity' },
  { path: 'valueQuantity.value', description: 'Numerical value', type: 'decimal' },
  { path: 'valueQuantity.unit', description: 'Unit representation', type: 'string' },
  { path: 'valueQuantity.system', description: 'System that defines coded unit form', type: 'uri' },
  { path: 'valueQuantity.code', description: 'Coded form of the unit', type: 'code' },
  { path: 'value.ofType(Quantity).value', description: 'Numerical value when value is Quantity', type: 'decimal' },
  { path: 'value.ofType(Quantity).unit', description: 'Unit when value is Quantity', type: 'string' },
  { path: 'dataAbsentReason', description: 'Why the result is missing', type: 'CodeableConcept' },
  { path: 'interpretation', description: 'High, low, normal, etc.', type: 'CodeableConcept[]' },
  { path: 'note', description: 'Comments about the observation', type: 'Annotation[]' },
  { path: 'method', description: 'How it was done', type: 'CodeableConcept' },
  { path: 'specimen', description: 'Specimen used for this observation', type: 'Reference' },
  { path: 'device', description: 'Device used for observation', type: 'Reference' },
  { path: 'referenceRange', description: 'Provides guide for interpretation', type: 'BackboneElement[]' },
  { path: 'component', description: 'Component observations', type: 'BackboneElement[]' },
  { path: 'component.code', description: 'Type of component observation', type: 'CodeableConcept' },
  { path: 'component.value', description: 'Component observation value', type: 'Quantity|CodeableConcept|string|boolean|integer|Range|Ratio|SampledData|time|dateTime|Period' },
  { path: 'meta.profile', description: 'Profiles this resource claims to conform to', type: 'canonical[]' }
];

const COMMON_FHIRPATH_PATTERNS = [
  '.first()',
  '.last()',
  '.exists()',
  '.empty()',
  '.where()',
  '.select()',
  '.all()',
  '.any()',
  '.count()',
  '.distinct()',
  'getResourceKey()',
  'resourceType'
];

export function getPathSuggestions(resourceType: string, query: string = ''): FHIRPathSuggestion[] {
  const paths = resourceType === 'Patient' ? PATIENT_PATHS : 
                resourceType === 'Observation' ? OBSERVATION_PATHS : 
                [];
  
  if (!query) return paths;
  
  const lowerQuery = query.toLowerCase();
  return paths.filter(path => 
    path.path.toLowerCase().includes(lowerQuery) ||
    path.description.toLowerCase().includes(lowerQuery)
  );
}

export function validateFHIRPath(path: string, resourceType?: string): FHIRPathValidationResult {
  if (!path || path.trim() === '') {
    return { isValid: false, error: 'FHIRPath expression cannot be empty' };
  }

  const trimmedPath = path.trim();
  
  // Basic syntax validation
  const syntaxErrors = [];
  
  // Check for balanced parentheses
  let parenCount = 0;
  let quoteSingle = false;
  let quoteDouble = false;
  
  for (let i = 0; i < trimmedPath.length; i++) {
    const char = trimmedPath[i];
    
    if (char === "'" && !quoteDouble) quoteSingle = !quoteSingle;
    if (char === '"' && !quoteSingle) quoteDouble = !quoteDouble;
    
    if (!quoteSingle && !quoteDouble) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        syntaxErrors.push('Unmatched closing parenthesis');
        break;
      }
    }
  }
  
  if (parenCount > 0) {
    syntaxErrors.push('Unmatched opening parenthesis');
  }
  
  if (quoteSingle || quoteDouble) {
    syntaxErrors.push('Unmatched quote');
  }
  
  // Check for invalid characters or patterns
  if (trimmedPath.includes('..')) {
    syntaxErrors.push('Double dots (..) are not valid in FHIRPath');
  }
  
  if (trimmedPath.startsWith('.') && !trimmedPath.startsWith('.where(') && !trimmedPath.startsWith('.first(') && !trimmedPath.startsWith('.exists(')) {
    syntaxErrors.push('FHIRPath cannot start with a dot unless it\'s a function');
  }
  
  if (syntaxErrors.length > 0) {
    return { isValid: false, error: syntaxErrors[0] };
  }
  
  // Semantic validation
  const semanticWarnings = [];
  
  // Check for resource-specific paths
  if (resourceType) {
    const validPaths = getPathSuggestions(resourceType);
    const rootPath = trimmedPath.split('.')[0].split('(')[0];
    
    if (rootPath !== 'getResourceKey' && rootPath !== 'resourceType' && rootPath !== 'meta') {
      const isValidRootPath = validPaths.some(p => 
        p.path.startsWith(rootPath) || p.path === rootPath
      );
      
      if (!isValidRootPath) {
        semanticWarnings.push(`'${rootPath}' may not be a valid path for ${resourceType} resources`);
      }
    }
  }
  
  return { 
    isValid: true, 
    suggestions: semanticWarnings.length > 0 ? semanticWarnings : undefined 
  };
}

export function getFHIRPathAutoComplete(input: string, resourceType: string): string[] {
  const suggestions: string[] = [];
  
  // Get all available paths for the resource type
  const paths = getPathSuggestions(resourceType);
  
  // Add common FHIRPath functions
  suggestions.push(...COMMON_FHIRPATH_PATTERNS);
  
  // Add resource-specific paths
  paths.forEach(path => {
    suggestions.push(path.path);
  });
  
  // Filter based on current input
  if (input) {
    const lowerInput = input.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(lowerInput));
  }
  
  return suggestions;
}

export function getFHIRPathExamples(resourceType: string): { category: string; examples: FHIRPathSuggestion[] }[] {
  const examples: { category: string; examples: FHIRPathSuggestion[] }[] = [];
  
  if (resourceType === 'Patient') {
    examples.push(
      {
        category: 'Basic Information',
        examples: [
          { path: 'id', description: 'Patient identifier', type: 'id' },
          { path: 'active', description: 'Active status', type: 'boolean' },
          { path: 'gender', description: 'Administrative gender', type: 'code' },
          { path: 'birthDate', description: 'Date of birth', type: 'date' }
        ]
      },
      {
        category: 'Names',
        examples: [
          { path: 'name.where(use = \'official\').family.first()', description: 'Official family name', type: 'string' },
          { path: 'name.where(use = \'official\').given.first()', description: 'Official given name', type: 'string' },
          { path: 'name.family.first()', description: 'First family name', type: 'string' }
        ]
      },
      {
        category: 'Contact Information',
        examples: [
          { path: 'telecom.where(system = \'email\').value.first()', description: 'Email address', type: 'string' },
          { path: 'telecom.where(system = \'phone\').value.first()', description: 'Phone number', type: 'string' },
          { path: 'address.line.first()', description: 'First address line', type: 'string' },
          { path: 'address.city.first()', description: 'City', type: 'string' }
        ]
      }
    );
  } else if (resourceType === 'Observation') {
    examples.push(
      {
        category: 'Core Fields',
        examples: [
          { path: 'status', description: 'Observation status', type: 'code' },
          { path: 'code.coding.where(system = \'http://loinc.org\').code.first()', description: 'LOINC code', type: 'code' },
          { path: 'effectiveDateTime', description: 'When observation was made', type: 'dateTime' }
        ]
      },
      {
        category: 'Values',
        examples: [
          { path: 'value.ofType(Quantity).value', description: 'Numeric value', type: 'decimal' },
          { path: 'value.ofType(Quantity).unit', description: 'Unit of measure', type: 'string' },
          { path: 'valueCodeableConcept.coding.code.first()', description: 'Coded value', type: 'code' }
        ]
      }
    );
  }
  
  return examples;
}
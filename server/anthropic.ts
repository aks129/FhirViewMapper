import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025

// Create Anthropic instance with dynamic API key
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required but not provided");
  }
  
  if (apiKey.trim() === '') {
    throw new Error("ANTHROPIC_API_KEY cannot be empty");
  }
  
  console.log("Creating Anthropic client with API key");
  return new Anthropic({ 
    apiKey,
    maxRetries: 3, // Add retries for reliability
  });
}

// Transform FHIR profile to SQL on FHIR view definition
export async function transformProfileToViewDefinition(
  profileData: any, 
  options: { 
    schema: string, 
    includeExtensions: boolean, 
    normalizeTables: boolean 
  }
): Promise<{ 
  viewDefinition: any, 
  sqlQuery: string,
  platformSql?: {
    databricks?: string,
    bigquery?: string,
    snowflake?: string,
    postgres?: string,
    sqlserver?: string
  }
}> {
  try {
    // Get the structure definition if available
    const structureDefinition = profileData.structureDefinition || {};
    const structureElements = structureDefinition.snapshot?.element || structureDefinition.differential?.element || [];
    
    // Extract mustSupport elements for better column generation
    const mustSupportElements = structureElements.filter((element: any) => 
      element.mustSupport === true || 
      (element.type && element.type.length > 0 && element.max && element.max !== '0')
    );
    
    // Identify fixed value constraints and slices
    const slicesAndFixedValues = structureElements.filter((element: any) => 
      element.sliceName || 
      element.fixed || 
      (element.patternCodeableConcept && element.patternCodeableConcept.coding)
    );
    
    // Construct detailed prompt for Claude following SQL on FHIR spec
    const prompt = `
You are a healthcare interoperability expert specializing in FHIR and SQL databases.

Your task is to transform a FHIR profile from an HL7 Implementation Guide into a SQL on FHIR view definition resource following the official specification at https://build.fhir.org/ig/FHIR/sql-on-fhir-v2/StructureDefinition-ViewDefinition.html

FHIR Profile details:
- Name: ${profileData.name}
- URL: ${profileData.url}
- Resource Type: ${profileData.resourceType}
- Version: ${profileData.version}
- Description: ${profileData.description || 'No description provided'}

Configuration options:
- Schema name: ${options.schema}
- Include Extensions: ${options.includeExtensions ? 'Yes' : 'No'} 
- Normalize Tables: ${options.normalizeTables ? 'Yes' : 'No'}

${mustSupportElements.length > 0 ? `
Important Profile Elements (mustSupport = true):
${mustSupportElements.slice(0, 15).map((element: any) => 
  `- ${element.path} (type: ${element.type ? element.type.map((t: any) => t.code).join('|') : 'unknown'}, max: ${element.max || '?'})`
).join('\n')}
` : ''}

${slicesAndFixedValues.length > 0 ? `
Slices and Fixed Values (for WHERE clauses):
${slicesAndFixedValues.slice(0, 10).map((element: any) => {
  let description = `- ${element.path}`;
  
  if (element.sliceName) {
    description += ` (slice: ${element.sliceName})`;
  }
  
  if (element.fixed) {
    const fixedType = Object.keys(element.fixed)[0];
    const fixedValue = element.fixed[fixedType];
    description += ` (fixed ${fixedType}: ${fixedValue})`;
  }
  
  if (element.patternCodeableConcept && element.patternCodeableConcept.coding) {
    const coding = element.patternCodeableConcept.coding[0];
    description += ` (pattern coding: system=${coding.system}, code=${coding.code})`;
  }
  
  return description;
}).join('\n')}
` : ''}

CRITICAL POINT ABOUT SELECT STRUCTURE:
The "select" field in the ViewDefinition must follow the latest SQL on FHIR specification format.
It should be structured as an array of objects, each containing either a "column" array 
or a "forEach" expression with a nested "column" array.

CORRECT structure for ViewDefinition select:
"select": [
  {
    "column": [
      {"name": "patient_id", "path": "getResourceKey()"},
      {"name": "gender", "path": "gender"}
    ]
  },
  {
    "forEach": "name.where(use = 'official').first()",
    "column": [
      {"path": "given.join(' ')", "name": "given_name"},
      {"path": "family", "name": "family_name"}
    ]
  }
]

GUIDELINES FOR HANDLING COMPLEX DATA TYPES:
1. For CodeableConcept:
   - Create columns for system, code, and display from the first coding
   - Example: For "code" (CodeableConcept), create columns like:
     - code_system: code.coding.first().system
     - code_code: code.coding.first().code
     - code_display: code.coding.first().display
     - code_text: code.text

2. For Identifier:
   - Create columns for system, value, and use
   - Example: For "identifier" (Identifier), create columns like:
     - identifier_system: identifier.first().system
     - identifier_value: identifier.first().value
     - identifier_use: identifier.first().use

3. For Reference:
   - Extract the referenced resource ID
   - Example: For "subject" (Reference(Patient)), create a column:
     - subject_id: subject.getReferenceKey(Patient)

4. For HumanName:
   - Extract given, family, use
   - Example: For "name" (HumanName), create columns like:
     - name_given: name.first().given.join(' ')
     - name_family: name.first().family
     - name_use: name.first().use

5. For Address:
   - Extract line, city, state, postalCode
   - Example: For "address" (Address), create columns like:
     - address_line: address.first().line.join(', ')
     - address_city: address.first().city
     - address_state: address.first().state
     - address_postal_code: address.first().postalCode

HANDLING CARDINALITY:
- For elements with max > 1, use .first() to select first element
- For collections that need all values, use the forEach construct
- Example: "name" array with multiple values, use:
  {
    "forEach": "name",
    "column": [
      {"path": "given.join(' ')", "name": "given_name"},
      {"path": "family", "name": "family_name"}
    ]
  }

Here is an example of a proper ViewDefinition for Observation resources (Blood Pressure):

Example ViewDefinition structure:
- resourceType: http://hl7.org/fhir/uv/sql-on-fhir/StructureDefinition/ViewDefinition
- constants with code values for filtering
- structured select with column definitions
- nested forEach elements to handle collections
- where clauses to filter by profile

INSTRUCTIONS:
1. Generate a FHIR ViewDefinition resource that follows the latest SQL on FHIR specification, using the above example as a model
2. The ViewDefinition must include these required elements:
   - resourceType: "http://hl7.org/fhir/uv/sql-on-fhir/StructureDefinition/ViewDefinition"
   - id: A unique identifier related to the profile name (kebab-case format)
   - status: "active" or "draft"
   - name: A descriptive name for the view (snake_case format for SQL compatibility)
   - resource: The base FHIR resource type this view is based on
   - constant: Define any LOINC or other codes needed for filtering
   - select: Structured array with column definitions and forEach sections for nested elements
   - where: FHIRPath expressions using the correct syntax to filter resources

3. Also generate the actual SQL query that would create this view in a SQL database
   - The SQL query should use proper FHIRPath traversal syntax
   - Make sure the SQL syntax is correct and would work in real databases

Your response MUST be in pure, parseable JSON format ONLY. No prose, explanations, or markdown code blocks. Return a single valid JSON object with these properties:

1. "viewDefinition" - A properly structured ViewDefinition resource including:
   - The correct resourceType URI
   - Appropriate id and name fields
   - Required select and where fields
   - Any needed constant values

2. "sqlQuery" - A string with the SQL query to create the view 

3. "platformSql" - An object with platform-specific SQL for different database systems

Notes:
- Make the view name match the profile name (with appropriate formatting)
- Include important fields as columns with correct paths
- Write a where clause that identifies resources conforming to this profile
- Include extension fields if the includeExtensions option is "Yes"
- Create a normalized table structure if normalizeTables is "Yes"
- Each platform-specific SQL script should account for syntax differences
- Always use properly formatted "select" array as described above

RESPONSE FORMAT: Return ONLY valid, parseable JSON without any explanations, markdown formatting, or code blocks.
`;

    // Get client with the current API key
    const anthropic = getAnthropicClient();
    
    console.log("Making API request to Claude...");
    
    // Create a timeout promise that will reject after 120 seconds
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("API request timed out after 120 seconds")), 120000);
    });
    
    // Race the Claude API call against the timeout
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
        system: "You are a healthcare interoperability expert specializing in SQL on FHIR. Respond with valid JSON only, following the exact format requested.",
      }),
      timeout
    ]) as Anthropic.Messages.Message;

    // Extract the response content
    if (!message.content || message.content.length === 0) {
      throw new Error("Empty response from Claude");
    }
    
    // Handle different types of content blocks
    let content = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        content = block.text;
        break;
      }
    }
    
    if (!content) {
      throw new Error("No text content found in Claude's response");
    }
    
    // Clean up the content to extract just the JSON
    // First, try to find JSON content between triple backticks
    let jsonContent = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonContent = codeBlockMatch[1];
    }
    
    // Otherwise, try to find JSON content between curly braces
    else {
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1];
      }
    }
    
    console.log("Extracted JSON content, attempting to parse...");
    
    try {
      // First attempt: Try to parse the complete JSON response
      try {
        const result = JSON.parse(jsonContent);
        
        // Validate that result has the expected structure
        if (!result.viewDefinition || !result.sqlQuery) {
          throw new Error("Claude's response is missing required fields (viewDefinition or sqlQuery)");
        }
        
        return {
          viewDefinition: result.viewDefinition,
          sqlQuery: result.sqlQuery,
          platformSql: result.platformSql || {
            databricks: result.sqlQuery,
            bigquery: result.sqlQuery,
            snowflake: result.sqlQuery,
            postgres: result.sqlQuery,
            sqlserver: result.sqlQuery
          }
        };
      } catch (error) {
        const initialParseError = error as Error;
        console.log("Initial JSON parse failed, trying alternate methods:", initialParseError.message);
      }
      
      // Second attempt: Handle potential JSON fixups
      console.log("Attempting to fix and parse incomplete JSON...");
      let fixedJson = jsonContent;

      // Check for incomplete JSON by adding missing closing braces/brackets
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        console.log(`Fixing unbalanced braces: ${openBraces} open, ${closeBraces} close`);
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '}';
        }
      }
      
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        console.log(`Fixing unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`);
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += ']';
        }
      }
      
      // Check for trailing commas at the end of objects/arrays
      fixedJson = fixedJson.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
      
      // Check for missing quotes around property names
      fixedJson = fixedJson.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":');
      
      // Try with the fixed JSON
      try {
        const result = JSON.parse(fixedJson);
        
        // Validate that result has the expected structure
        if (!result.viewDefinition || !result.sqlQuery) {
          throw new Error("Fixed JSON is missing required fields");
        }
        
        console.log("Successfully parsed JSON after fixing");
        return {
          viewDefinition: result.viewDefinition,
          sqlQuery: result.sqlQuery,
          platformSql: result.platformSql || {
            databricks: result.sqlQuery,
            bigquery: result.sqlQuery,
            snowflake: result.sqlQuery,
            postgres: result.sqlQuery,
            sqlserver: result.sqlQuery
          }
        };
      } catch (error) {
        const fixedJsonError = error as Error;
        console.log("Failed to parse fixed JSON:", fixedJsonError.message);
      }
      
      // Third attempt: Extract and repair viewDefinition separately
      console.log("Attempting to extract viewDefinition separately...");
      
      // Try to extract just the viewDefinition part
      const viewDefMatch = jsonContent.match(/"viewDefinition"\s*:\s*(\{[\s\S]*?(?:\}\s*,|\}\s*\}))/);
      let viewDefinition;
      
      if (viewDefMatch && viewDefMatch[1]) {
        try {
          // Clean up the extracted viewDefinition string
          let viewDefString = viewDefMatch[1];
          
          // Remove trailing comma if present
          viewDefString = viewDefString.replace(/,\s*$/, '');
          
          // Make sure it's properly closed
          const openBraces = (viewDefString.match(/\{/g) || []).length;
          const closeBraces = (viewDefString.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            for (let i = 0; i < openBraces - closeBraces; i++) {
              viewDefString += '}';
            }
          }
          
          viewDefinition = JSON.parse(viewDefString);
          console.log("Successfully extracted viewDefinition");
        } catch (error) {
          const viewDefError = error as Error;
          console.log("Failed to parse extracted viewDefinition:", viewDefError.message);
        }
      }
      
      // Try to extract just the SQL query
      const sqlQueryMatch = jsonContent.match(/"sqlQuery"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      let sqlQuery = "-- SQL query could not be extracted";
      
      if (sqlQueryMatch && sqlQueryMatch[1]) {
        sqlQuery = sqlQueryMatch[1].replace(/\\"/g, '"');
        console.log("Successfully extracted sqlQuery");
      }
      
      // If we have at least a viewDefinition, return it
      if (viewDefinition) {
        return {
          viewDefinition,
          sqlQuery,
          platformSql: {
            databricks: sqlQuery,
            bigquery: sqlQuery,
            snowflake: sqlQuery,
            postgres: sqlQuery,
            sqlserver: sqlQuery
          }
        };
      }
      
      // Last resort: Create a more robust viewDefinition from the profile data and structure definition
      console.log("Creating fallback ViewDefinition from profile data and elements");
      
      // Get structure definition elements for better column generation
      const structureDefinition = profileData.structureDefinition || {};
      const elements = structureDefinition.snapshot?.element || structureDefinition.differential?.element || [];
      
      // Build a better select array with important elements
      const mainColumns = [
        { name: "id", path: "getResourceKey()" },
        { name: "resource_type", path: "resourceType" }
      ];
      
      // Find basic primitive data type elements that can be easily represented as columns
      const primitiveTypes = ['string', 'code', 'id', 'boolean', 'decimal', 'integer', 'date', 'dateTime', 'instant', 'time', 'uri', 'url'];
      
      // Add primitive elements from the structure definition
      if (elements.length > 0) {
        console.log(`Adding columns from ${elements.length} structure definition elements`);
        
        elements.forEach((element: any) => {
          // Skip the base resource element
          if (element.path === profileData.resourceType) {
            return;
          }
          
          // Skip complex elements with arrays or nested structures for the basic view
          if (element.max === '*' || element.path.split('.').length > 2) {
            return;
          }
          
          // Check if element has primitive types
          const hasPrimitiveType = element.type && element.type.some((t: any) => primitiveTypes.includes(t.code));
          
          if (hasPrimitiveType) {
            const pathParts = element.path.split('.');
            if (pathParts.length >= 2) {
              // Remove resource type from beginning
              pathParts.shift();
              const path = pathParts.join('.');
              const name = pathParts.join('_').toLowerCase();
              
              mainColumns.push({ name, path });
            }
          }
        });
      }
      
      // Create some special columns based on common FHIR patterns
      if (profileData.resourceType === 'Patient') {
        mainColumns.push(
          { name: "name_given", path: "name.first().given.join(' ')" },
          { name: "name_family", path: "name.first().family" },
          { name: "gender", path: "gender" },
          { name: "birth_date", path: "birthDate" }
        );
      } else if (profileData.resourceType === 'Observation') {
        mainColumns.push(
          { name: "status", path: "status" },
          { name: "category_coding_code", path: "category.first().coding.first().code" },
          { name: "code_coding_code", path: "code.coding.first().code" },
          { name: "code_coding_display", path: "code.coding.first().display" },
          { name: "effective_date_time", path: "effective.ofType(dateTime)" },
          { name: "value_quantity_value", path: "value.ofType(Quantity).value" },
          { name: "value_quantity_unit", path: "value.ofType(Quantity).unit" },
          { name: "subject_reference", path: "subject.reference" }
        );
      } else if (profileData.resourceType === 'Condition') {
        mainColumns.push(
          { name: "clinical_status", path: "clinicalStatus.coding.first().code" },
          { name: "verification_status", path: "verificationStatus.coding.first().code" },
          { name: "code_coding_code", path: "code.coding.first().code" },
          { name: "code_coding_display", path: "code.coding.first().display" },
          { name: "subject_reference", path: "subject.reference" },
          { name: "onset_date_time", path: "onset.ofType(dateTime)" }
        );
      } else if (profileData.resourceType === 'Encounter') {
        mainColumns.push(
          { name: "status", path: "status" },
          { name: "class_code", path: "class.code" },
          { name: "type_coding_code", path: "type.first().coding.first().code" },
          { name: "subject_reference", path: "subject.reference" },
          { name: "period_start", path: "period.start" },
          { name: "period_end", path: "period.end" }
        );
      } else if (profileData.resourceType === 'Medication' || profileData.resourceType === 'MedicationRequest') {
        mainColumns.push(
          { name: "status", path: "status" },
          { name: "medication_coding_code", path: "medication.ofType(CodeableConcept).coding.first().code" },
          { name: "medication_coding_display", path: "medication.ofType(CodeableConcept).coding.first().display" },
          { name: "subject_reference", path: "subject.reference" }
        );
      }
      
      viewDefinition = {
        resourceType: "http://hl7.org/fhir/uv/sql-on-fhir/StructureDefinition/ViewDefinition",
        id: `${profileData.name.toLowerCase().replace(/\s+/g, '-')}-view`,
        name: profileData.name.toLowerCase().replace(/\s+/g, '_').substring(0, 50), // Limit length for SQL compatibility
        resource: profileData.resourceType,
        status: "active",
        select: [
          {
            column: mainColumns
          }
        ],
        where: [
          { path: `meta.profile.contains('${profileData.url}')` }
        ]
      };
      
      // Build SQL column selection string based on the enhanced mainColumns
      const columnSelections = mainColumns.map(col => {
        // For simple primitive paths
        if (!col.path.includes('.') || col.path === 'getResourceKey()' || col.path === 'resourceType') {
          return `${col.path === 'getResourceKey()' ? 'id' : col.path} as ${col.name}`;
        }
        
        // For complex paths, use appropriate SQL syntax based on FHIRPath
        // This is a simplified approach - actual implementation would need more sophisticated parsing
        if (col.path.includes('.first()')) {
          return `${col.path.replace(/\.first\(\)/g, '[0]')} as ${col.name}`;
        }
        
        if (col.path.includes('.ofType(')) {
          // Replace ofType with appropriate SQL casting
          return `${col.path.replace(/\.ofType\([^)]+\)/g, '')} as ${col.name}`;
        }
        
        if (col.path.includes('.join(')) {
          // For join operations, just access the array (databases would handle differently)
          return `${col.path.replace(/\.join\([^)]+\)/g, '')} as ${col.name}`;
        }
        
        // Default approach for dot notation
        return `${col.path} as ${col.name}`;
      });
      
      // Generate the SQL query with all columns
      const sqlColumns = columnSelections.join(',\n  ');
      
      const genericSqlQuery = `-- Fallback SQL query
CREATE VIEW ${viewDefinition.name} AS
SELECT 
  ${sqlColumns}
FROM ${profileData.resourceType}
WHERE meta.profile LIKE '%${profileData.url}%'`;
      
      // Create platform-specific SQL with appropriate syntax
      return {
        viewDefinition,
        sqlQuery: genericSqlQuery,
        platformSql: {
          databricks: genericSqlQuery.replace(
            /WHERE meta\.profile LIKE '%(.+?)%'/,
            "WHERE array_contains(meta.profile, '$1')"
          ),
          bigquery: genericSqlQuery.replace(
            /WHERE meta\.profile LIKE '%(.+?)%'/,
            "WHERE '$1' IN UNNEST(meta.profile)"
          ),
          snowflake: genericSqlQuery.replace(
            /WHERE meta\.profile LIKE '%(.+?)%'/,
            "WHERE array_contains(meta.profile, '$1')"
          ),
          postgres: genericSqlQuery.replace(
            /WHERE meta\.profile LIKE '%(.+?)%'/,
            "WHERE meta.profile @> ARRAY['$1']"
          ),
          sqlserver: genericSqlQuery.replace(
            /WHERE meta\.profile LIKE '%(.+?)%'/,
            "WHERE JSON_QUERY(meta, '$.profile') LIKE '%$1%'"
          )
        }
      };
    } catch (error) {
      const parseError = error as Error;
      console.error("Failed in JSON parsing and recovery:", parseError);
      throw new Error(`Failed to process Claude's response: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("Error in transformProfileToViewDefinition:", error);
    throw new Error(`Failed to transform profile: ${error?.message || 'Unknown error'}`);
  }
}

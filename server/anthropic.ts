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

This structure allows for both direct column selection and nested iterations over collections.

INSTRUCTIONS:
1. Generate a FHIR ViewDefinition resource that follows the latest SQL on FHIR specification
2. The ViewDefinition must include these required elements:
   - resourceType: "ViewDefinition"
   - id: A unique identifier (kebab-case format recommended)
   - status: "active" or appropriate status
   - name: A name for the view (snake_case format recommended for SQL compatibility)
   - resource: The base FHIR resource type this view is based on (e.g., "Patient", "Observation")
   - select: Array with column definitions as described above
   - where: FHIRPath expressions to filter the resources

3. Also generate the actual SQL query that would create this view in a SQL database
   - The SQL query should use proper FHIRPath traversal syntax
   - Make sure the SQL syntax is correct and would work in real databases

Your response MUST be in pure, parseable JSON format ONLY. No prose, explanations, or markdown code blocks. Return a single valid JSON object with the following properties:

{
  "viewDefinition": {
    "resourceType": "ViewDefinition",
    "id": "example-view-id",
    "url": "http://example.org/fhir/ViewDefinition/example-view-id",
    "version": "1.0.0",
    "name": "example_view_name",
    "resource": "Patient",
    "status": "active",
    "select": [
      {
        "column": [
          {"name": "patient_id", "path": "getResourceKey()"},
          {"name": "gender", "path": "gender"},
          {"name": "birth_date", "path": "birthDate"}
        ]
      },
      {
        "forEach": "name.where(use = 'official').first()",
        "column": [
          {"path": "given.join(' ')", "name": "given_name"},
          {"path": "family", "name": "family_name"}
        ]
      }
    ],
    "where": [
      {"fhirPath": "meta.profile.contains('http://example.org/fhir/Profile/example')"}
    ]
  },
  "sqlQuery": "CREATE VIEW example_view AS SELECT id, meta.profile FROM Patient WHERE meta.profile LIKE '%http://example.org/fhir/Profile/example%'",
  "platformSql": {
    "databricks": "CREATE VIEW example_view AS SELECT id, meta.profile FROM Patient WHERE array_contains(meta.profile, 'http://example.org/fhir/Profile/example')",
    "bigquery": "CREATE VIEW example_view AS SELECT id, meta.profile FROM Patient WHERE 'http://example.org/fhir/Profile/example' IN UNNEST(meta.profile)",
    "snowflake": "CREATE VIEW example_view AS SELECT id, meta.profile FROM Patient WHERE array_contains(meta.profile, 'http://example.org/fhir/Profile/example')",
    "postgres": "CREATE VIEW example_view AS SELECT id, meta.profile FROM Patient WHERE meta.profile @> ARRAY['http://example.org/fhir/Profile/example']",
    "sqlserver": "CREATE VIEW example_view AS SELECT id, meta.profile FROM Patient WHERE JSON_QUERY(meta, '$.profile') LIKE '%http://example.org/fhir/Profile/example%'"
  }
}

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
      } catch (initialParseError) {
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
      } catch (fixedJsonError) {
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
        } catch (viewDefError) {
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
      
      // Last resort: Create a minimal viewDefinition from the profile data
      console.log("Creating minimal viewDefinition from profile data");
      viewDefinition = {
        resourceType: "ViewDefinition",
        id: `${profileData.name.toLowerCase().replace(/\s+/g, '-')}-view`,
        name: profileData.name.toLowerCase().replace(/\s+/g, '_'),
        resource: profileData.resourceType,
        status: "active",
        select: [
          {
            column: [
              { name: "id", path: "id" },
              { name: "resource_type", path: "resourceType" }
            ]
          }
        ],
        where: [
          { fhirPath: `meta.profile.contains('${profileData.url}')` }
        ]
      };
      
      return {
        viewDefinition,
        sqlQuery: `-- Fallback SQL query\nCREATE VIEW ${viewDefinition.name} AS\nSELECT id, resourceType\nFROM ${profileData.resourceType}\nWHERE meta.profile LIKE '%${profileData.url}%'`,
        platformSql: {
          databricks: `-- Fallback SQL query\nCREATE VIEW ${viewDefinition.name} AS\nSELECT id, resourceType\nFROM ${profileData.resourceType}\nWHERE array_contains(meta.profile, '${profileData.url}')`,
          bigquery: `-- Fallback SQL query\nCREATE VIEW ${viewDefinition.name} AS\nSELECT id, resourceType\nFROM ${profileData.resourceType}\nWHERE '${profileData.url}' IN UNNEST(meta.profile)`,
          snowflake: `-- Fallback SQL query\nCREATE VIEW ${viewDefinition.name} AS\nSELECT id, resourceType\nFROM ${profileData.resourceType}\nWHERE array_contains(meta.profile, '${profileData.url}')`,
          postgres: `-- Fallback SQL query\nCREATE VIEW ${viewDefinition.name} AS\nSELECT id, resourceType\nFROM ${profileData.resourceType}\nWHERE meta.profile @> ARRAY['${profileData.url}']`,
          sqlserver: `-- Fallback SQL query\nCREATE VIEW ${viewDefinition.name} AS\nSELECT id, resourceType\nFROM ${profileData.resourceType}\nWHERE JSON_QUERY(meta, '$.profile') LIKE '%${profileData.url}%'`
        }
      };
    } catch (parseError) {
      console.error("Failed in JSON parsing and recovery:", parseError);
      throw new Error(`Failed to process Claude's response: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("Error in transformProfileToViewDefinition:", error);
    throw new Error(`Failed to transform profile: ${error?.message || 'Unknown error'}`);
  }
}

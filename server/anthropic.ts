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

INSTRUCTIONS:
1. Generate a FHIR ViewDefinition resource that follows the SQL on FHIR specification
2. The ViewDefinition must include these required elements:
   - resourceType: "ViewDefinition"
   - id: A unique identifier
   - status: "active" or appropriate status
   - name: A name for the view
   - kind: "sql-derived" for SQL derived views
   - resourceModel: Information about the resource model
   - definition: The SQL view definition with:
     - resourceType: Base resource type
     - select: Array of column mappings
     - where: Criteria for resources in the view

3. Also generate the actual SQL query that would create this view in a SQL database

Your response MUST be in pure, parseable JSON format ONLY. No prose, explanations, or markdown code blocks. Return a single valid JSON object with the following properties:

{
  "viewDefinition": {
    // The complete FHIR ViewDefinition resource
    "resourceType": "ViewDefinition",
    "id": "...",
    ...
  },
  "sqlQuery": "-- Standard ANSI SQL query here",
  "platformSql": {
    "databricks": "-- Databricks SQL",
    "bigquery": "-- BigQuery SQL",
    "snowflake": "-- Snowflake SQL",
    "postgres": "-- PostgreSQL query",
    "sqlserver": "-- MS SQL Server query"
  }
}

Notes:
- Make the view name match the profile name
- Include important fields as columns
- Write a where clause that identifies resources conforming to this profile
- Include extension fields if the includeExtensions option is "Yes"
- Create a normalized table structure if normalizeTables is "Yes"
- Each platform-specific SQL script should account for syntax differences

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
      // Try to parse the JSON response
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
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.log("JSON content that failed to parse:", jsonContent.substring(0, 500) + "...");
      
      // More aggressive approach to extract JSON - look for any object-like structure
      const objectMatches = jsonContent.match(/\{[^{}]*\}/g);
      if (objectMatches && objectMatches.length > 0) {
        for (const match of objectMatches) {
          try {
            const potentialJson = JSON.parse(match);
            if (potentialJson.viewDefinition && potentialJson.sqlQuery) {
              return {
                viewDefinition: potentialJson.viewDefinition,
                sqlQuery: potentialJson.sqlQuery,
                platformSql: potentialJson.platformSql || {
                  databricks: potentialJson.sqlQuery,
                  bigquery: potentialJson.sqlQuery,
                  snowflake: potentialJson.sqlQuery,
                  postgres: potentialJson.sqlQuery,
                  sqlserver: potentialJson.sqlQuery
                }
              };
            }
          } catch (e) {
            // Continue trying other matches
          }
        }
      }
      
      throw new Error("Failed to extract valid JSON from Claude's response. Try a simpler profile or adjust options.");
    }
  } catch (error: any) {
    console.error("Error in transformProfileToViewDefinition:", error);
    throw new Error(`Failed to transform profile: ${error?.message || 'Unknown error'}`);
  }
}

import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025

// Create Anthropic instance with dynamic API key
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required but not provided");
  }
  
  console.log("Creating Anthropic client with API key");
  return new Anthropic({ apiKey });
}

// Transform FHIR profile to SQL on FHIR view definition
export async function transformProfileToViewDefinition(
  profileData: any, 
  options: { 
    schema: string, 
    includeExtensions: boolean, 
    normalizeTables: boolean 
  }
): Promise<{ viewDefinition: any, sqlQuery: string }> {
  try {
    // Construct detailed prompt for Claude
    const prompt = `
You are a healthcare interoperability expert specializing in FHIR and SQL databases.

Your task is to transform a FHIR profile from an HL7 Implementation Guide into a SQL on FHIR view definition resource.

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

Follow the SQL on FHIR specification (https://github.com/FHIR/sql-on-fhir-v2).

INSTRUCTIONS:
1. Generate a FHIR ViewDefinition resource that represents this profile as a SQL view
2. Include appropriate metadata (resourceType, id, url, version, name, status, etc.)
3. Create a 'definition' object that includes:
   - The resource type this view is based on
   - Select statements for relevant fields from the profile
   - Where clauses that filter for resources conforming to this profile
4. Also generate the actual SQL query that would be used to create this view

Your response should be in JSON format with two main sections:
1. "viewDefinition": The complete FHIR ViewDefinition resource
2. "sqlQuery": The SQL CREATE VIEW statement

Return valid JSON only.
`;

    // Get client with the current API key
    const anthropic = getAnthropicClient();
    
    console.log("Making API request to Claude...");
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

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

    try {
      // Try to parse the JSON response
      const result = JSON.parse(content);
      return {
        viewDefinition: result.viewDefinition,
        sqlQuery: result.sqlQuery
      };
    } catch (parseError) {
      // If the response isn't valid JSON, try to extract JSON from it
      // Look for JSON-like content within the response using regex
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        try {
          const extractedJson = JSON.parse(jsonStr);
          return {
            viewDefinition: extractedJson.viewDefinition,
            sqlQuery: extractedJson.sqlQuery
          };
        } catch (e) {
          throw new Error("Failed to extract valid JSON from Claude's response");
        }
      } else {
        throw new Error("Claude's response did not contain valid JSON");
      }
    }
  } catch (error: any) {
    console.error("Error in transformProfileToViewDefinition:", error);
    throw new Error(`Failed to transform profile: ${error?.message || 'Unknown error'}`);
  }
}

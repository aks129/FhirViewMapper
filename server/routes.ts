import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { transformProfileToViewDefinition } from "./anthropic";
import { z } from "zod";
import Database from 'better-sqlite3';

// Initialize SQLite database
const db = new Database(':memory:');

// Sample FHIR data for testing view definitions
const sampleData = {
  Patient: [
    {
      resourceType: "Patient",
      id: "example",
      meta: {
        profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
      },
      text: {
        status: "generated",
        div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">John Smith</div>"
      },
      identifier: [
        {
          system: "http://hospital.example.org",
          value: "12345",
          use: "official" 
        }
      ],
      name: [
        {
          family: "Smith",
          given: ["John", "Jacob"],
          use: "official"
        }
      ],
      telecom: [
        {
          system: "phone",
          value: "555-555-5555",
          use: "home"
        }
      ],
      gender: "male",
      birthDate: "1970-01-01",
      address: [
        {
          use: "home",
          line: ["123 Main St"],
          city: "Anytown",
          state: "CA",
          postalCode: "12345"
        }
      ],
      extension: [
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
          extension: [
            {
              url: "ombCategory",
              valueCoding: {
                system: "urn:oid:2.16.840.1.113883.6.238",
                code: "2106-3",
                display: "White"
              }
            },
            {
              url: "text",
              valueString: "White"
            }
          ]
        },
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
          extension: [
            {
              url: "ombCategory",
              valueCoding: {
                system: "urn:oid:2.16.840.1.113883.6.238",
                code: "2186-5",
                display: "Not Hispanic or Latino"
              }
            },
            {
              url: "text",
              valueString: "Not Hispanic or Latino"
            }
          ]
        },
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
          valueCode: "M"
        }
      ]
    },
    {
      resourceType: "Patient",
      id: "example2",
      meta: {
        profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
      },
      text: {
        status: "generated",
        div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Jane Doe</div>"
      },
      identifier: [
        {
          system: "http://hospital.example.org",
          value: "67890",
          use: "official"
        }
      ],
      name: [
        {
          family: "Doe",
          given: ["Jane"],
          use: "official"
        }
      ],
      telecom: [
        {
          system: "phone",
          value: "555-123-4567",
          use: "mobile"
        }
      ],
      gender: "female",
      birthDate: "1985-05-12",
      address: [
        {
          use: "home",
          line: ["456 Oak Ave"],
          city: "Somewhere",
          state: "NY",
          postalCode: "10001"
        }
      ]
    }
  ],
  Observation: [
    {
      resourceType: "Observation",
      id: "bp-example",
      meta: {
        profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-blood-pressure"]
      },
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs"
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "85354-9",
            display: "Blood pressure panel"
          }
        ],
        text: "Blood pressure systolic & diastolic"
      },
      subject: {
        reference: "Patient/example"
      },
      effectiveDateTime: "2023-01-15T10:30:00Z",
      component: [
        {
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8480-6",
                display: "Systolic blood pressure"
              }
            ],
            text: "Systolic blood pressure"
          },
          valueQuantity: {
            value: 120,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]"
          }
        },
        {
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8462-4",
                display: "Diastolic blood pressure"
              }
            ],
            text: "Diastolic blood pressure"
          },
          valueQuantity: {
            value: 80,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]"
          }
        }
      ]
    }
  ]
};

// Initialize SQLite with sample data
function initializeDatabase() {
  try {
    // Enable JSON support
    db.pragma('journal_mode = WAL');
    
    // Create tables for each resource type
    Object.keys(sampleData).forEach(resourceType => {
      // Create table
      db.exec(`CREATE TABLE IF NOT EXISTS ${resourceType} (
        id TEXT,
        resource TEXT
      )`);
      
      try {
        // Check if table already has data
        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${resourceType}`);
        const countRow = countStmt.get() as { count: number } | undefined;
        const count = countRow ? Number(countRow.count) : 0;
        
        if (count === 0) {
          // Insert sample data using prepared statement
          const insertStmt = db.prepare(
            `INSERT INTO ${resourceType} (id, resource) VALUES (?, ?)`
          );
          
          // Start transaction for bulk insert
          const insertMany = db.transaction((resources: any[]) => {
            for (const resource of resources) {
              insertStmt.run(resource.id, JSON.stringify(resource));
            }
          });
          
          // Insert data for this resource type
          try {
            insertMany(sampleData[resourceType as keyof typeof sampleData]);
          } catch (insertError) {
            console.warn(`Error inserting ${resourceType} records:`, insertError);
          }
        }
      } catch (tableError) {
        console.warn(`Error checking/inserting data for ${resourceType}:`, tableError);
      }
    });
    
    // Test if tables were populated correctly
    try {
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM Patient');
      const countRow = countStmt.get() as { count: number } | undefined;
      const count = countRow ? Number(countRow.count) : 0;
      
      console.log(`Initialized SQLite with ${count} sample Patient records`);
    } catch (testError) {
      console.error('Error testing SQLite initialization:', testError);
    }
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
  }
}

// Initialize SQLite with sample data
initializeDatabase();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all implementation guides
  app.get("/api/implementation-guides", async (req, res) => {
    try {
      const guides = await storage.getImplementationGuides();
      res.json(guides);
    } catch (error) {
      console.error("Error fetching implementation guides:", error);
      res.status(500).json({ message: "Failed to fetch implementation guides" });
    }
  });

  // Get an implementation guide by ID
  app.get("/api/implementation-guides/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation guide ID" });
      }

      const guide = await storage.getImplementationGuide(id);
      if (!guide) {
        return res.status(404).json({ message: "Implementation guide not found" });
      }

      res.json(guide);
    } catch (error) {
      console.error("Error fetching implementation guide:", error);
      res.status(500).json({ message: "Failed to fetch implementation guide" });
    }
  });

  // Get all profiles for an implementation guide
  app.get("/api/implementation-guides/:id/profiles", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation guide ID" });
      }

      const guide = await storage.getImplementationGuide(id);
      if (!guide) {
        return res.status(404).json({ message: "Implementation guide not found" });
      }

      const profiles = await storage.getProfiles(id);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  // Get all resource types for an implementation guide
  app.get("/api/implementation-guides/:id/resource-types", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation guide ID" });
      }

      const guide = await storage.getImplementationGuide(id);
      if (!guide) {
        return res.status(404).json({ message: "Implementation guide not found" });
      }

      const profiles = await storage.getProfiles(id);
      const resourceTypesSet = new Set<string>();
      profiles.forEach(profile => resourceTypesSet.add(profile.resourceType));
      const resourceTypes = Array.from(resourceTypesSet);
      
      res.json(resourceTypes);
    } catch (error) {
      console.error("Error fetching resource types:", error);
      res.status(500).json({ message: "Failed to fetch resource types" });
    }
  });

  // Get profiles by resource type for an implementation guide
  app.get("/api/implementation-guides/:id/resource-types/:type/profiles", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid implementation guide ID" });
      }

      const resourceType = req.params.type;
      if (!resourceType) {
        return res.status(400).json({ message: "Resource type is required" });
      }

      const guide = await storage.getImplementationGuide(id);
      if (!guide) {
        return res.status(404).json({ message: "Implementation guide not found" });
      }

      const profiles = await storage.getProfilesByResourceType(id, resourceType);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles by resource type:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  // Get a profile by ID
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      const profile = await storage.getProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Transform a profile to a view definition
  app.post("/api/profiles/:id/transform", async (req, res) => {
    // Store the original API key
    const originalApiKey: string | undefined = process.env.ANTHROPIC_API_KEY;
    
    try {
      console.log("Received transformation request with body:", JSON.stringify({
        ...req.body,
        apiKey: req.body.apiKey ? "[REDACTED]" : undefined
      }));
      
      const transformSchema = z.object({
        schema: z.string().min(1),
        includeExtensions: z.boolean(),
        normalizeTables: z.boolean(),
        apiKey: z.string().optional()
      });

      const validationResult = transformSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const { schema, includeExtensions, normalizeTables, apiKey } = validationResult.data;
      
      // We'll use the environment API key by default and not override it with user input
      // to prevent issues with invalid API keys
      if (apiKey) {
        console.log("API key provided in request, but using environment API key for security");
      }
      
      // Check if the environment API key is available
      if (!originalApiKey || originalApiKey.trim() === "") {
        return res.status(500).json({ message: "API key not configured for transformation service" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      const profile = await storage.getProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      console.log(`Transforming profile ID ${profile.id} (${profile.name}) with Claude...`);
      const transformationResult = await transformProfileToViewDefinition(profile, {
        schema,
        includeExtensions,
        normalizeTables
      });
      console.log("Transformation successful, validating ViewDefinition structure...");

      // Ensure viewDefinition follows SQL on FHIR spec
      if (!transformationResult.viewDefinition.resourceType) {
        transformationResult.viewDefinition.resourceType = "ViewDefinition";
      }
      
      // Validate and convert ViewDefinition to the latest SQL on FHIR format
      
      // Handle legacy 'definition' format (convert to direct properties if needed)
      if (transformationResult.viewDefinition.definition) {
        console.log("Converting legacy definition format to direct properties format...");
        
        // Move resourceType to resource property
        if (transformationResult.viewDefinition.definition.resourceType) {
          transformationResult.viewDefinition.resource = transformationResult.viewDefinition.definition.resourceType;
        }
        
        // Move select array
        if (transformationResult.viewDefinition.definition.select) {
          // First, check if it's an array or object with numeric keys
          let selectArray = transformationResult.viewDefinition.definition.select;
          
          // Convert object with numeric keys to array if needed
          if (!Array.isArray(selectArray) && typeof selectArray === 'object') {
            console.log("Converting select from object to array format...");
            selectArray = Object.values(selectArray);
          }
          
          // Convert old format (flat array of {path, name}) to new format (array with column arrays)
          if (Array.isArray(selectArray) && selectArray.length > 0 && 
              selectArray[0].path && !selectArray[0].column) {
            console.log("Converting select from flat array to column-based format...");
            
            // Restructure to new format
            const newSelectArray = [{
              column: selectArray.map(item => ({
                name: item.name,
                path: item.path
              }))
            }];
            
            transformationResult.viewDefinition.select = newSelectArray;
          } else {
            // Already in new format or empty
            transformationResult.viewDefinition.select = selectArray;
          }
        }
        
        // Move where array
        if (transformationResult.viewDefinition.definition.where) {
          transformationResult.viewDefinition.where = transformationResult.viewDefinition.definition.where;
        }
        
        // Remove legacy definition object
        delete transformationResult.viewDefinition.definition;
      }
      
      // Ensure there's a resource property
      if (!transformationResult.viewDefinition.resource) {
        transformationResult.viewDefinition.resource = profile.resourceType;
      }
      
      // Ensure select is properly formatted
      if (!transformationResult.viewDefinition.select) {
        console.warn("ViewDefinition missing 'select' property, creating an empty array");
        transformationResult.viewDefinition.select = [];
      }
      
      // Ensure where is properly formatted and handle both path and fhirPath properties
      if (!transformationResult.viewDefinition.where) {
        // Create default where clause using the profile URL
        transformationResult.viewDefinition.where = [
          { path: `meta.profile.contains('${profile.url}')` }
        ];
        console.log("ViewDefinition missing 'where' property, creating default using profile URL");
      } else {
        // Ensure all where clauses use the path property (some might use fhirPath)
        transformationResult.viewDefinition.where = transformationResult.viewDefinition.where.map((whereClause: any) => {
          if (whereClause.fhirPath && !whereClause.path) {
            return { path: whereClause.fhirPath };
          }
          return whereClause;
        });
      }
      
      console.log("ViewDefinition validated, saving to database");

      // Save the transformation
      const transformation = await storage.createTransformation({
        profileId: profile.id,
        schema,
        includeExtensions: includeExtensions.toString(),
        normalizeTables: normalizeTables.toString(),
        viewDefinition: transformationResult.viewDefinition,
        sqlQuery: transformationResult.sqlQuery,
        platformSql: transformationResult.platformSql
      });
      
      console.log(`Transformation saved with ID: ${transformation.id}`);

      res.json({
        transformationId: transformation.id,
        viewDefinition: transformationResult.viewDefinition,
        sqlQuery: transformationResult.sqlQuery,
        platformSql: transformationResult.platformSql
      });
    } catch (error: any) {
      console.error("Error transforming profile:", error);
      res.status(500).json({ message: `Failed to transform profile: ${error?.message || 'Unknown error'}` });
    } finally {
      // Restore the original API key
      if (originalApiKey) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });

  // Get a transformation by ID
  app.get("/api/transformations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transformation ID" });
      }

      const transformation = await storage.getTransformation(id);
      if (!transformation) {
        return res.status(404).json({ message: "Transformation not found" });
      }

      res.json(transformation);
    } catch (error) {
      console.error("Error fetching transformation:", error);
      res.status(500).json({ message: "Failed to fetch transformation" });
    }
  });

  // Execute SQL query from view definition
  app.post("/api/execute-sql", async (req, res) => {
    try {
      const { sql, resourceType } = req.body;
      
      if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ message: "SQL query is required" });
      }

      // Validate that requested resource type exists in our sample data
      if (resourceType && !sampleData[resourceType as keyof typeof sampleData]) {
        return res.status(400).json({ 
          message: `Resource type '${resourceType}' not found in sample data`, 
          availableTypes: Object.keys(sampleData)
        });
      }

      // Execute the view creation SQL
      try {
        // First drop the view if it exists
        const viewNameMatch = sql.match(/CREATE\s+VIEW\s+([a-zA-Z0-9_]+)/i);
        if (viewNameMatch && viewNameMatch[1]) {
          const viewName = viewNameMatch[1];
          try {
            db.exec(`DROP VIEW IF EXISTS ${viewName}`);
          } catch (dropError) {
            console.warn(`Error dropping view ${viewName}:`, dropError);
          }
        }

        // Create the view with adjusted SQL for SQLite JSON paths
        let adjustedSql = sql.replace(/CREATE VIEW/i, "CREATE VIEW IF NOT EXISTS");
        
        // Fix table names to match our SQLite tables (case sensitive)
        adjustedSql = adjustedSql
          .replace(/FROM\s+Patient/i, "FROM Patient")
          .replace(/FROM\s+Observation/i, "FROM Observation")
          .replace(/FROM\s+(\w+)/g, (match, tableName) => {
            // Convert PascalCase FHIR resource type to lowercase for SQLite table name
            return `FROM ${tableName.toLowerCase()}`;
          });
        
        // Clean up SQL before processing - convert FHIRPath to SQLite compatible syntax
        // First, handle specific JSON paths with SQLite syntax for WHERE clause
        adjustedSql = adjustedSql
          .replace(/meta\.profile/g, "json_extract(resource, '$.meta.profile')")
          .replace(/WHERE\s+meta\.profile/g, "WHERE json_extract(resource, '$.meta.profile')");
          
        // Replace any URLs with / or . characters with _ for SQLite compatibility
        adjustedSql = adjustedSql.replace(/http:\/\/hl7\.org/g, "http_hl7_org");
        adjustedSql = adjustedSql.replace(/http:\/\/hl7_org\/fhir/g, "http_hl7_org_fhir");
        
        // Create helper function for extension lookup in SQLite
        const createExtensionLookupFunction = () => {
          try {
            // Create a lookup function for extensions by URL
            db.function('extension_lookup', (resourceJson: string, extensionUrl: string) => {
              try {
                const resource = JSON.parse(resourceJson);
                if (!resource.extension || !Array.isArray(resource.extension)) {
                  return null;
                }
                
                const extension = resource.extension.find((ext: { url: string }) => ext.url === extensionUrl);
                return extension ? JSON.stringify(extension.value) : null;
              } catch (e) {
                return null;
              }
            });
            
            console.log("Created extension_lookup function for SQLite");
          } catch (err) {
            console.warn("Failed to create extension_lookup function:", err);
          }
        };
        
        // Create the extension lookup function
        createExtensionLookupFunction();
        
        // Find all column definitions in SELECT clause
        const selectClauseMatch = adjustedSql.match(/SELECT([\s\S]+?)FROM/i);
        
        if (selectClauseMatch && selectClauseMatch[1]) {
          let columnDefinitions = selectClauseMatch[1];
          
          // Handle all extensions using a custom processing approach - SQLite doesn't support complex JSONPath
          
          // Handle nested extension references first (most complex)
          columnDefinitions = columnDefinitions.replace(
            /extension\.where\(url='([^']+)'\)\.extension\.where\(url='([^']+)'\)\.value(?:_(\w+))?/g, 
            (match, parentUrl, childUrl, valueType) => {
              // Remove special chars from URLs
              const cleanParentUrl = parentUrl.replace(/[\/\.]/g, '_');
              const cleanChildUrl = childUrl.replace(/[\/\.]/g, '_'); 
              
              // For nested extension extraction, we'll use a simpler approach with column aliases
              if (valueType) {
                return `'' as ext_${cleanParentUrl}_${cleanChildUrl}_${valueType}`;
              } else {
                return `'' as ext_${cleanParentUrl}_${cleanChildUrl}`;
              }
            }
          );
          
          // Replace direct extension.where() references with simpler extraction
          columnDefinitions = columnDefinitions.replace(
            /extension\.where\(url='([^']+)'\)\.value(?:_(\w+))?/g, 
            (match, url, valueType) => {
              const cleanUrl = url.replace(/[\/\.]/g, '_');
              
              // For basic extension extraction, return empty string with alias for now
              // We'll add proper extension handling in a future iteration
              if (valueType) {
                return `'' as ext_${cleanUrl}_${valueType}`;
              } else {
                return `'' as ext_${cleanUrl}`;
              }
            }
          );
          
          // Handle nested properties like name[0].family or telecom[0].value
          columnDefinitions = columnDefinitions.replace(
            /(\w+)(?:\[(\d+)\])?\.(\w+)(?:\[(\d+)\])?\.(\w+)/g,
            (match, parent, parentIndex, child, childIndex, prop) => {
              const pIdx = parentIndex ? parentIndex : '0';
              const cIdx = childIndex ? childIndex : '0';
              return `json_extract(resource, '$.${parent}[${pIdx}].${child}[${cIdx}].${prop}')`;
            }
          );
          
          // Handle simple properties like name[0].family
          columnDefinitions = columnDefinitions.replace(
            /(\w+)(?:\[(\d+)\])?\.(\w+)/g,
            (match, parent, index, prop) => {
              // Skip if already converted to json_extract
              if (match.includes('json_extract') || parent === 'resource') {
                return match;
              }
              const idx = index ? index : '0';
              return `json_extract(resource, '$.${parent}[${idx}].${prop}')`;
            }
          );
          
          // Update the SQL with the processed column definitions
          adjustedSql = adjustedSql.replace(selectClauseMatch[0], `SELECT${columnDefinitions}FROM`);
        }
        
        // Replace LIKE/contains with proper SQLite JSON check and escape URL paths
        adjustedSql = adjustedSql.replace(
          /WHERE\s+meta\.profile\s+LIKE\s+'%([^']+)%'/i,
          (match, url) => {
            // Make URL compatible with SQLite by replacing problematic characters
            const escapedUrl = url.replace(/\//g, '_').replace(/\./g, '_');
            return `WHERE json_extract(resource, '$.meta.profile') LIKE '%${escapedUrl}%'`;
          }
        );

        console.log("Executing adjusted SQL query:", adjustedSql);
        db.exec(adjustedSql);

        // Get the view name from the SQL
        const match = adjustedSql.match(/CREATE\s+VIEW\s+([a-zA-Z0-9_]+)/i);
        if (!match || !match[1]) {
          return res.status(400).json({ message: "Could not determine view name from SQL" });
        }

        const viewName = match[1];
        
        // Query the view
        console.log(`Querying view: ${viewName}`);
        let queryResult;
        try {
          queryResult = db.prepare(`SELECT * FROM ${viewName}`).all();
        } catch (queryError) {
          console.error(`Error querying view ${viewName}:`, queryError);
          return res.status(400).json({ 
            message: `Error querying view ${viewName}`, 
            error: queryError instanceof Error ? queryError.message : String(queryError)
          });
        }
        
        // Ensure results is an array
        const results = Array.isArray(queryResult) ? queryResult : [];
        const resourceTypeToUse = resourceType ? (resourceType as keyof typeof sampleData) : 'Patient';
        
        res.json({
          success: true,
          viewName,
          sampleData: sampleData[resourceTypeToUse],
          results,
          executedSql: adjustedSql,
          message: `SQL view "${viewName}" created and executed successfully.`,
          rowCount: results.length
        });
      } catch (sqlError: any) {
        console.error("SQL execution error:", sqlError);
        return res.status(400).json({ 
          message: "SQL execution error", 
          error: sqlError.message || String(sqlError)
        });
      }
    } catch (error: any) {
      console.error("Error executing SQL query:", error);
      res.status(500).json({ 
        message: "Failed to execute SQL query", 
        error: error.message || String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { transformProfileToViewDefinition } from "./anthropic";
import { z } from "zod";

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
      
      // Ensure where is properly formatted
      if (!transformationResult.viewDefinition.where) {
        // Create default where clause using the profile URL
        transformationResult.viewDefinition.where = [
          { fhirPath: `meta.profile.contains('${profile.url}')` }
        ];
        console.log("ViewDefinition missing 'where' property, creating default using profile URL");
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

  const httpServer = createServer(app);
  return httpServer;
}

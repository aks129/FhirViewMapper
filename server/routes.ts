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
      
      // Use the API key from the environment or from the request
      const anthropicApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
      
      // Ensure there's an API key available
      if (!anthropicApiKey) {
        return res.status(400).json({ message: "API key is required for transformation" });
      }
      
      // Temporarily set the API key for this request
      process.env.ANTHROPIC_API_KEY = anthropicApiKey;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      const profile = await storage.getProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const transformationResult = await transformProfileToViewDefinition(profile, {
        schema,
        includeExtensions,
        normalizeTables
      });

      // Save the transformation
      const transformation = await storage.createTransformation({
        profileId: profile.id,
        schema,
        includeExtensions: includeExtensions.toString(),
        normalizeTables: normalizeTables.toString(),
        viewDefinition: transformationResult.viewDefinition,
        sqlQuery: transformationResult.sqlQuery
      });

      res.json({
        transformationId: transformation.id,
        viewDefinition: transformationResult.viewDefinition,
        sqlQuery: transformationResult.sqlQuery
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

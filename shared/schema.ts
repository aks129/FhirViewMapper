import { pgTable, text, serial, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Main users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Implementation Guides table
export const implementationGuides = pgTable("implementation_guides", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  url: text("url").notNull(),
  description: text("description"),
});

export const insertImplementationGuideSchema = createInsertSchema(implementationGuides).pick({
  name: true,
  version: true,
  url: true,
  description: true,
});

// Profiles table
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  implementationGuideId: serial("implementation_guide_id").notNull(),
  resourceType: text("resource_type").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  version: text("version"),
  description: text("description"),
  structureDefinition: json("structure_definition"),
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  implementationGuideId: true,
  resourceType: true,
  name: true,
  url: true,
  version: true,
  description: true,
  structureDefinition: true,
});

// Transformations table
export const transformations = pgTable("transformations", {
  id: serial("id").primaryKey(),
  profileId: serial("profile_id").notNull(),
  schema: text("schema").notNull(),
  includeExtensions: text("include_extensions").notNull(),
  normalizeTables: text("normalize_tables").notNull(),
  viewDefinition: json("view_definition"),
  sqlQuery: text("sql_query"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransformationSchema = createInsertSchema(transformations).pick({
  profileId: true,
  schema: true,
  includeExtensions: true,
  normalizeTables: true,
  viewDefinition: true,
  sqlQuery: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ImplementationGuide = typeof implementationGuides.$inferSelect;
export type InsertImplementationGuide = z.infer<typeof insertImplementationGuideSchema>;

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type Transformation = typeof transformations.$inferSelect;
export type InsertTransformation = z.infer<typeof insertTransformationSchema>;

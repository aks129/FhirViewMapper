import { 
  insertImplementationGuideSchema, 
  type ImplementationGuide, 
  type InsertImplementationGuide, 
  type Profile, 
  type InsertProfile, 
  type Transformation, 
  type InsertTransformation, 
  type User, 
  type InsertUser
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Implementation Guides
  getImplementationGuides(): Promise<ImplementationGuide[]>;
  getImplementationGuide(id: number): Promise<ImplementationGuide | undefined>;
  getImplementationGuideByName(name: string): Promise<ImplementationGuide | undefined>;
  createImplementationGuide(guide: InsertImplementationGuide): Promise<ImplementationGuide>;

  // Profiles
  getProfiles(implementationGuideId: number): Promise<Profile[]>;
  getProfilesByResourceType(implementationGuideId: number, resourceType: string): Promise<Profile[]>;
  getProfile(id: number): Promise<Profile | undefined>;
  getProfileByUrl(url: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;

  // Transformations
  getTransformations(profileId: number): Promise<Transformation[]>;
  getTransformation(id: number): Promise<Transformation | undefined>;
  createTransformation(transformation: InsertTransformation): Promise<Transformation>;
}

import { db } from "./db";
import { 
  users, 
  implementationGuides, 
  profiles, 
  transformations
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with US Core implementation guide
    this.initializeUSCore();
  }

  private async initializeUSCore() {
    // Check if we already have implementation guides
    const existingGuides = await db.select().from(implementationGuides);
    if (existingGuides.length > 0) {
      console.log("Implementation guides already exist in the database, skipping initialization");
      return;
    }

    // US Core 5.0.1
    const usCore5: InsertImplementationGuide = {
      name: "US Core",
      version: "5.0.1",
      url: "https://www.hl7.org/fhir/us/core/",
      description: "The US Core Implementation Guide is based on FHIR Version R4 and defines the minimum conformance requirements for accessing patient data."
    };
    
    // US Core 6.1.0
    const usCore6: InsertImplementationGuide = {
      name: "US Core",
      version: "6.1.0",
      url: "https://www.hl7.org/fhir/us/core/",
      description: "The US Core Implementation Guide version 6.1.0 is based on FHIR Version R4 and provides essential updates to the specification."
    };
    
    // Initialize US Core 5.0.1
    try {
      const guide5 = await this.createImplementationGuide(usCore5);
      
      // Add common resource profiles
      const resourceTypes = [
        "Patient",
        "Practitioner",
        "Organization",
        "Observation",
        "Condition",
        "Procedure",
        "MedicationRequest",
        "Immunization",
        "AllergyIntolerance",
        "Encounter"
      ];
      
      for (const type of resourceTypes) {
        const profile: InsertProfile = {
          implementationGuideId: guide5.id,
          resourceType: type.toLowerCase(),
          name: `US Core ${type} Profile`,
          url: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-${type.toLowerCase()}`,
          version: "5.0.1",
          description: `The US Core ${type} Profile is based on FHIR Version R4.`,
          structureDefinition: { resourceType: "StructureDefinition" }
        };
          
        await this.createProfile(profile);
      }
        
      // Initialize US Core 6.1.0
      const guide6 = await this.createImplementationGuide(usCore6);
      
      // Add common resource profiles with updated structure definitions
      const resourceTypes6 = [
        "Patient",
        "Practitioner",
        "Organization",
        "Observation",
        "Condition",
        "Procedure",
        "MedicationRequest",
        "Immunization",
        "AllergyIntolerance",
        "Encounter",
        "DocumentReference", // Added in 6.1.0
        "Provenance",       // Added in 6.1.0
        "CarePlan"          // Added in 6.1.0
      ];
        
      for (const type of resourceTypes6) {
        const profile: InsertProfile = {
          implementationGuideId: guide6.id,
          resourceType: type.toLowerCase(),
          name: `US Core ${type} Profile`,
          url: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-${type.toLowerCase()}`,
          version: "6.1.0",
          description: `The US Core ${type} Profile version 6.1.0, based on FHIR Version R4.`,
          structureDefinition: { 
            resourceType: "StructureDefinition",
            url: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-${type.toLowerCase()}`,
            version: "6.1.0",
            name: `USCore${type}Profile`,
            status: "active",
            fhirVersion: "4.0.1",
            kind: "resource",
            abstract: false,
            type: type,
            baseDefinition: `http://hl7.org/fhir/StructureDefinition/${type}`,
            derivation: "constraint"
          }
        };
          
        await this.createProfile(profile);
      }
    } catch (error) {
      console.error("Error initializing US Core profiles:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Implementation Guide methods
  async getImplementationGuides(): Promise<ImplementationGuide[]> {
    return db.select().from(implementationGuides);
  }

  async getImplementationGuide(id: number): Promise<ImplementationGuide | undefined> {
    const [guide] = await db.select().from(implementationGuides).where(eq(implementationGuides.id, id));
    return guide;
  }

  async getImplementationGuideByName(name: string): Promise<ImplementationGuide | undefined> {
    const [guide] = await db.select().from(implementationGuides).where(eq(implementationGuides.name, name));
    return guide;
  }

  async createImplementationGuide(insertGuide: InsertImplementationGuide): Promise<ImplementationGuide> {
    const [guide] = await db.insert(implementationGuides).values({
      name: insertGuide.name,
      version: insertGuide.version,
      url: insertGuide.url,
      description: insertGuide.description ?? null
    }).returning();
    return guide;
  }

  // Profile methods
  async getProfiles(implementationGuideId: number): Promise<Profile[]> {
    return db.select().from(profiles).where(eq(profiles.implementationGuideId, implementationGuideId));
  }

  async getProfilesByResourceType(implementationGuideId: number, resourceType: string): Promise<Profile[]> {
    return db.select().from(profiles)
      .where(sql`${profiles.implementationGuideId} = ${implementationGuideId} AND ${profiles.resourceType} = ${resourceType}`);
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getProfileByUrl(url: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.url, url));
    return profile;
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values({
      implementationGuideId: insertProfile.implementationGuideId,
      resourceType: insertProfile.resourceType,
      name: insertProfile.name,
      url: insertProfile.url,
      version: insertProfile.version ?? null,
      description: insertProfile.description ?? null,
      structureDefinition: insertProfile.structureDefinition
    }).returning();
    return profile;
  }

  // Transformation methods
  async getTransformations(profileId: number): Promise<Transformation[]> {
    return db.select().from(transformations).where(eq(transformations.profileId, profileId));
  }

  async getTransformation(id: number): Promise<Transformation | undefined> {
    const [transformation] = await db.select().from(transformations).where(eq(transformations.id, id));
    return transformation;
  }

  async createTransformation(insertTransformation: InsertTransformation): Promise<Transformation> {
    const [transformation] = await db.insert(transformations).values({
      profileId: insertTransformation.profileId,
      schema: insertTransformation.schema,
      includeExtensions: insertTransformation.includeExtensions,
      normalizeTables: insertTransformation.normalizeTables,
      viewDefinition: insertTransformation.viewDefinition,
      sqlQuery: insertTransformation.sqlQuery ?? null,
      createdAt: new Date()
    }).returning();
    return transformation;
  }
}

// Use MemStorage for now due to database connection issues
export class MemStorage implements IStorage {
  private users: User[] = [];
  private implementationGuides: ImplementationGuide[] = [];
  private profiles: Profile[] = [];
  private transformations: Transformation[] = [];
  private nextUserId = 1;
  private nextGuideId = 1;
  private nextProfileId = 1;
  private nextTransformationId = 1;

  constructor() {
    this.initializeUSCore();
  }

  private async initializeUSCore() {
    // Initialize US Core Implementation Guides
    const usCore5: ImplementationGuide = {
      id: this.nextGuideId++,
      name: "US Core Implementation Guide",
      version: "5.0.1",
      url: "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core",
      description: "US Core Implementation Guide v5.0.1"
    };

    const usCore6: ImplementationGuide = {
      id: this.nextGuideId++,
      name: "US Core Implementation Guide",
      version: "6.1.0",
      url: "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core-6.1.0",
      description: "US Core Implementation Guide v6.1.0"
    };

    this.implementationGuides.push(usCore5, usCore6);

    // Initialize US Core profiles for both versions
    const usCore5Profiles = [
      {
        id: this.nextProfileId++,
        implementationGuideId: usCore5.id,
        resourceType: "Patient",
        name: "US Core Patient Profile",
        url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
        version: "5.0.1",
        description: "US Core Patient Profile"
      },
      {
        id: this.nextProfileId++,
        implementationGuideId: usCore5.id,
        resourceType: "Observation",
        name: "US Core Blood Pressure Profile",
        url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-blood-pressure",
        version: "5.0.1",
        description: "US Core Blood Pressure Profile"
      }
    ];

    const usCore6Profiles = [
      {
        id: this.nextProfileId++,
        implementationGuideId: usCore6.id,
        resourceType: "Patient",
        name: "US Core Patient Profile",
        url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
        version: "6.1.0",
        description: "US Core Patient Profile"
      },
      {
        id: this.nextProfileId++,
        implementationGuideId: usCore6.id,
        resourceType: "Observation",
        name: "US Core Blood Pressure Profile",
        url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-blood-pressure",
        version: "6.1.0",
        description: "US Core Blood Pressure Profile"
      }
    ];

    this.profiles.push(...usCore5Profiles, ...usCore6Profiles);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      username: insertUser.username,
      hashedPassword: insertUser.hashedPassword
    };
    this.users.push(user);
    return user;
  }

  async getImplementationGuides(): Promise<ImplementationGuide[]> {
    return this.implementationGuides;
  }

  async getImplementationGuide(id: number): Promise<ImplementationGuide | undefined> {
    return this.implementationGuides.find(guide => guide.id === id);
  }

  async getImplementationGuideByName(name: string): Promise<ImplementationGuide | undefined> {
    return this.implementationGuides.find(guide => guide.name === name);
  }

  async createImplementationGuide(insertGuide: InsertImplementationGuide): Promise<ImplementationGuide> {
    const guide: ImplementationGuide = {
      id: this.nextGuideId++,
      name: insertGuide.name,
      version: insertGuide.version,
      url: insertGuide.url,
      description: insertGuide.description
    };
    this.implementationGuides.push(guide);
    return guide;
  }

  async getProfiles(implementationGuideId: number): Promise<Profile[]> {
    return this.profiles.filter(profile => profile.implementationGuideId === implementationGuideId);
  }

  async getProfilesByResourceType(implementationGuideId: number, resourceType: string): Promise<Profile[]> {
    return this.profiles.filter(profile => 
      profile.implementationGuideId === implementationGuideId && profile.resourceType === resourceType
    );
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    return this.profiles.find(profile => profile.id === id);
  }

  async getProfileByUrl(url: string): Promise<Profile | undefined> {
    return this.profiles.find(profile => profile.url === url);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const profile: Profile = {
      id: this.nextProfileId++,
      implementationGuideId: insertProfile.implementationGuideId,
      resourceType: insertProfile.resourceType,
      name: insertProfile.name,
      url: insertProfile.url,
      version: insertProfile.version,
      description: insertProfile.description,
      structureDefinition: insertProfile.structureDefinition
    };
    this.profiles.push(profile);
    return profile;
  }

  async getTransformations(profileId: number): Promise<Transformation[]> {
    return this.transformations.filter(transformation => transformation.profileId === profileId);
  }

  async getTransformation(id: number): Promise<Transformation | undefined> {
    return this.transformations.find(transformation => transformation.id === id);
  }

  async createTransformation(insertTransformation: InsertTransformation): Promise<Transformation> {
    const transformation: Transformation = {
      id: this.nextTransformationId++,
      profileId: insertTransformation.profileId,
      schema: insertTransformation.schema,
      includeExtensions: insertTransformation.includeExtensions,
      normalizeTables: insertTransformation.normalizeTables,
      viewDefinition: insertTransformation.viewDefinition,
      sqlQuery: insertTransformation.sqlQuery,
      createdAt: new Date()
    };
    this.transformations.push(transformation);
    return transformation;
  }
}

export const storage = new MemStorage();

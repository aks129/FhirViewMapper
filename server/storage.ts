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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private implementationGuides: Map<number, ImplementationGuide>;
  private profiles: Map<number, Profile>;
  private transformations: Map<number, Transformation>;
  
  private currentUserId: number;
  private currentImplementationGuideId: number;
  private currentProfileId: number;
  private currentTransformationId: number;

  constructor() {
    this.users = new Map();
    this.implementationGuides = new Map();
    this.profiles = new Map();
    this.transformations = new Map();
    
    this.currentUserId = 1;
    this.currentImplementationGuideId = 1;
    this.currentProfileId = 1;
    this.currentTransformationId = 1;

    // Initialize with US Core implementation guide
    this.initializeUSCore();
  }

  private initializeUSCore() {
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
    this.createImplementationGuide(usCore5)
      .then(guide => {
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
        
        resourceTypes.forEach(type => {
          const profile: InsertProfile = {
            implementationGuideId: guide.id,
            resourceType: type.toLowerCase(),
            name: `US Core ${type} Profile`,
            url: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-${type.toLowerCase()}`,
            version: "5.0.1",
            description: `The US Core ${type} Profile is based on FHIR Version R4.`,
            structureDefinition: { resourceType: "StructureDefinition" }
          };
          
          this.createProfile(profile).catch(console.error);
        });
      })
      .catch(console.error);
    
    // Initialize US Core 6.1.0
    this.createImplementationGuide(usCore6)
      .then(guide => {
        // Add common resource profiles with updated structure definitions
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
          "Encounter",
          "DocumentReference", // Added in 6.1.0
          "Provenance",       // Added in 6.1.0
          "CarePlan"          // Added in 6.1.0
        ];
        
        resourceTypes.forEach(type => {
          const profile: InsertProfile = {
            implementationGuideId: guide.id,
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
          
          this.createProfile(profile).catch(console.error);
        });
      })
      .catch(console.error);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Implementation Guide methods
  async getImplementationGuides(): Promise<ImplementationGuide[]> {
    return Array.from(this.implementationGuides.values());
  }

  async getImplementationGuide(id: number): Promise<ImplementationGuide | undefined> {
    return this.implementationGuides.get(id);
  }

  async getImplementationGuideByName(name: string): Promise<ImplementationGuide | undefined> {
    return Array.from(this.implementationGuides.values()).find(
      (guide) => guide.name === name,
    );
  }

  async createImplementationGuide(insertGuide: InsertImplementationGuide): Promise<ImplementationGuide> {
    const id = this.currentImplementationGuideId++;
    const guide: ImplementationGuide = { ...insertGuide, id };
    this.implementationGuides.set(id, guide);
    return guide;
  }

  // Profile methods
  async getProfiles(implementationGuideId: number): Promise<Profile[]> {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.implementationGuideId === implementationGuideId,
    );
  }

  async getProfilesByResourceType(implementationGuideId: number, resourceType: string): Promise<Profile[]> {
    return Array.from(this.profiles.values()).filter(
      (profile) => 
        profile.implementationGuideId === implementationGuideId && 
        profile.resourceType === resourceType,
    );
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByUrl(url: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(
      (profile) => profile.url === url,
    );
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = this.currentProfileId++;
    const profile: Profile = { ...insertProfile, id };
    this.profiles.set(id, profile);
    return profile;
  }

  // Transformation methods
  async getTransformations(profileId: number): Promise<Transformation[]> {
    return Array.from(this.transformations.values()).filter(
      (transformation) => transformation.profileId === profileId,
    );
  }

  async getTransformation(id: number): Promise<Transformation | undefined> {
    return this.transformations.get(id);
  }

  async createTransformation(insertTransformation: InsertTransformation): Promise<Transformation> {
    const id = this.currentTransformationId++;
    const createdAt = new Date();
    const transformation: Transformation = { 
      ...insertTransformation, 
      id,
      createdAt
    };
    this.transformations.set(id, transformation);
    return transformation;
  }
}

export const storage = new MemStorage();

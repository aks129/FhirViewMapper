import React from 'react';
import { Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Home: React.FC = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            FHIR Profile to SQL View Definition Transformer
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Convert HL7 Implementation Guide profiles to SQL on FHIR view definitions
            using Claude AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Select Implementation Guide</CardTitle>
              <CardDescription>
                Choose from supported Implementation Guides like US Core
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse and select from popular FHIR Implementation Guides to find the profiles
                you need to transform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Profile</CardTitle>
              <CardDescription>
                Browse available profiles from the selected guide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose from resource types like Patient, Observation, or Condition and select
                the specific profile you want to convert.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate SQL View</CardTitle>
              <CardDescription>
                Transform profiles into SQL on FHIR view definitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Using Claude AI, convert FHIR profiles into SQL view definitions that follow
                the SQL on FHIR specification.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-12">
          <Link href="/transform">
            <Button size="lg" className="px-8">
              Start Transformation
            </Button>
          </Link>
        </div>

        <div className="bg-muted p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">About SQL on FHIR</h2>
          <p className="mb-4">
            SQL on FHIR is a specification that defines a standard way to represent FHIR resources
            in a relational database format, making it easier to query FHIR data using SQL.
          </p>
          <p className="mb-4">
            This tool helps healthcare data engineers and analysts convert FHIR profiles into
            SQL views that conform to the SQL on FHIR v2 specification.
          </p>
          <div className="flex justify-center mt-6">
            <a 
              href="https://github.com/FHIR/sql-on-fhir-v2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              Learn more about SQL on FHIR
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="M7 7h10v10"></path>
                <path d="M7 17L17 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;

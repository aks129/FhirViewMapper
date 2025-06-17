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
            SQL-on-FHIR ViewDefinition Builder
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Build SQL-on-FHIR ViewDefinition resources from HL7 Implementation Guide profiles
            with an interactive column mapper and validator.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Interactive ViewDefinition Builder */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Interactive ViewDefinition Builder</CardTitle>
              <CardDescription>
                Build ViewDefinitions with a visual column mapper and validator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">1</div>
                  <span className="text-sm">Select Implementation Guide & Profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">2</div>
                  <span className="text-sm">Configure columns with FHIRPath expressions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">3</div>
                  <span className="text-sm">Add where clauses and validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">4</div>
                  <span className="text-sm">Generate & execute ViewDefinition</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/builder" className="w-full">
                <Button size="lg" className="w-full">
                  Start Building
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* AI-Powered Transform */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">AI-Powered Transform</CardTitle>
              <CardDescription>
                Use Claude AI to automatically generate ViewDefinitions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-medium">1</div>
                  <span className="text-sm">Select Implementation Guide & Profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-medium">2</div>
                  <span className="text-sm">Configure transformation options</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-medium">3</div>
                  <span className="text-sm">AI automatically generates ViewDefinition</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-medium">4</div>
                  <span className="text-sm">Review and export results</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/transform" className="w-full">
                <Button variant="outline" size="lg" className="w-full">
                  Use AI Transform
                </Button>
              </Link>
            </CardFooter>
          </Card>
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

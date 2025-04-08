import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, Database } from 'lucide-react';
import { JsonViewer } from '@/components/ui/json-viewer';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SqlExecutorProps {
  viewDefinition: any;
  sqlQuery: string;
  platformSql?: {
    databricks?: string;
    bigquery?: string;
    snowflake?: string;
    postgres?: string;
    sqlserver?: string;
  };
  resourceType?: string;
}

export const SqlExecutor: React.FC<SqlExecutorProps> = ({ 
  viewDefinition, 
  sqlQuery, 
  platformSql,
  resourceType 
}) => {
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExecuteQuery = async () => {
    try {
      setExecuting(true);
      setError(null);
      setResults(null);

      // Determine the SQL to execute (use the generic SQL by default)
      const sqlToExecute = sqlQuery;

      // Execute the SQL query against DuckDB
      const response = await apiRequest(
        'POST',
        '/api/execute-sql',
        {
          sql: sqlToExecute,
          resourceType: resourceType || viewDefinition?.resource || 'Patient'
        }
      );
      
      const data = await response.json();
      setResults(data);
      
      toast({
        title: "SQL executed successfully",
        description: `Query returned ${data.rowCount || 0} results.`,
        variant: "default"
      });
    } catch (err: any) {
      console.error('Error executing SQL:', err);
      setError(err.message || 'Failed to execute SQL query');
      
      toast({
        title: "SQL execution failed",
        description: err.message || 'An error occurred while executing the SQL query',
        variant: "destructive"
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">SQL Execution</h2>
        <Button 
          onClick={handleExecuteQuery} 
          disabled={executing}
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          {executing ? 'Executing...' : 'Execute SQL Query'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Query Results
            </CardTitle>
            <CardDescription>
              SQL view "{results.viewName}" executed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results">
              <TabsList>
                <TabsTrigger value="results">Results ({results.rowCount || 0})</TabsTrigger>
                <TabsTrigger value="sampleData">Sample Data</TabsTrigger>
                <TabsTrigger value="executedSql">Executed SQL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="mt-4">
                <JsonViewer 
                  data={results.results} 
                  title="Query Results" 
                  downloadFileName="query-results.json"
                  height="400px"
                />
              </TabsContent>
              
              <TabsContent value="sampleData" className="mt-4">
                <JsonViewer 
                  data={results.sampleData} 
                  title="Sample FHIR Data" 
                  downloadFileName="sample-data.json"
                  height="400px"
                />
              </TabsContent>
              
              <TabsContent value="executedSql" className="mt-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
                    {results.executedSql || sqlQuery}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-end">
            <div className="text-sm text-gray-500">
              Executed against DuckDB with sample FHIR data
            </div>
          </CardFooter>
        </Card>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Available SQL Queries</h3>
        <Tabs defaultValue="generic">
          <TabsList>
            <TabsTrigger value="generic">Generic SQL</TabsTrigger>
            {platformSql?.databricks && <TabsTrigger value="databricks">Databricks</TabsTrigger>}
            {platformSql?.bigquery && <TabsTrigger value="bigquery">BigQuery</TabsTrigger>}
            {platformSql?.snowflake && <TabsTrigger value="snowflake">Snowflake</TabsTrigger>}
            {platformSql?.postgres && <TabsTrigger value="postgres">PostgreSQL</TabsTrigger>}
            {platformSql?.sqlserver && <TabsTrigger value="sqlserver">SQL Server</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="generic" className="mt-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">{sqlQuery}</pre>
            </div>
          </TabsContent>
          
          {platformSql?.databricks && (
            <TabsContent value="databricks" className="mt-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">{platformSql.databricks}</pre>
              </div>
            </TabsContent>
          )}
          
          {platformSql?.bigquery && (
            <TabsContent value="bigquery" className="mt-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">{platformSql.bigquery}</pre>
              </div>
            </TabsContent>
          )}
          
          {platformSql?.snowflake && (
            <TabsContent value="snowflake" className="mt-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">{platformSql.snowflake}</pre>
              </div>
            </TabsContent>
          )}
          
          {platformSql?.postgres && (
            <TabsContent value="postgres" className="mt-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">{platformSql.postgres}</pre>
              </div>
            </TabsContent>
          )}
          
          {platformSql?.sqlserver && (
            <TabsContent value="sqlserver" className="mt-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">{platformSql.sqlserver}</pre>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};
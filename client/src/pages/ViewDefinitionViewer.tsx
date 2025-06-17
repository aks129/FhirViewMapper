import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JsonViewer } from '@/components/ui/json-viewer';
import { Download, Play, FileText, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { copyToClipboard, downloadJson } from '@/lib/fhir-utils';
import { useToast } from '@/hooks/use-toast';

interface ViewDefinitionViewerProps {
  viewDefinition: any;
  onExecuteView?: (viewDefinition: any) => void;
  onNewViewDefinition: () => void;
  executionResults?: {
    success: boolean;
    results?: any[];
    error?: string;
    executedSql?: string;
  };
}

export const ViewDefinitionViewer: React.FC<ViewDefinitionViewerProps> = ({
  viewDefinition,
  onExecuteView,
  onNewViewDefinition,
  executionResults
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('definition');

  const handleCopyDefinition = async () => {
    const success = await copyToClipboard(JSON.stringify(viewDefinition, null, 2));
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "ViewDefinition JSON has been copied to clipboard"
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Failed to copy ViewDefinition to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDefinition = () => {
    downloadJson(viewDefinition, `${viewDefinition.name || 'viewdefinition'}.json`);
    toast({
      title: "Download started",
      description: "ViewDefinition JSON file is being downloaded"
    });
  };

  const handleExecuteView = () => {
    if (onExecuteView) {
      onExecuteView(viewDefinition);
      setActiveTab('execution');
    }
  };

  const generateSQL = () => {
    // Basic SQL generation from ViewDefinition
    const tableName = viewDefinition.resource?.toLowerCase() || 'resource';
    const columns = viewDefinition.select?.flatMap((sel: any) => 
      sel.column?.map((col: any) => `${col.path} AS ${col.name}`) || []
    ) || [];
    
    const whereConditions = viewDefinition.where?.map((w: any) => w.path) || [];
    
    let sql = `-- Generated SQL for ViewDefinition: ${viewDefinition.name}\n`;
    sql += `CREATE VIEW ${viewDefinition.name} AS\n`;
    sql += `SELECT\n  ${columns.join(',\n  ')}\n`;
    sql += `FROM ${tableName}\n`;
    
    if (whereConditions.length > 0) {
      sql += `WHERE\n  ${whereConditions.join('\n  AND ')}\n`;
    }
    
    return sql;
  };

  const validateViewDefinition = () => {
    const issues = [];
    
    if (!viewDefinition.resourceType || viewDefinition.resourceType !== 'ViewDefinition') {
      issues.push('Missing or invalid resourceType');
    }
    
    if (!viewDefinition.name || typeof viewDefinition.name !== 'string') {
      issues.push('Missing or invalid name');
    }
    
    if (!viewDefinition.resource || typeof viewDefinition.resource !== 'string') {
      issues.push('Missing or invalid resource type');
    }
    
    if (!viewDefinition.status || !['draft', 'active', 'retired'].includes(viewDefinition.status)) {
      issues.push('Missing or invalid status');
    }
    
    if (!viewDefinition.select || !Array.isArray(viewDefinition.select) || viewDefinition.select.length === 0) {
      issues.push('Missing or empty select array');
    }
    
    viewDefinition.select?.forEach((sel: any, index: number) => {
      if (!sel.column || !Array.isArray(sel.column)) {
        issues.push(`Select item ${index}: missing column array`);
      } else {
        sel.column.forEach((col: any, colIndex: number) => {
          if (!col.name) issues.push(`Select item ${index}, column ${colIndex}: missing name`);
          if (!col.path) issues.push(`Select item ${index}, column ${colIndex}: missing path`);
        });
      }
    });
    
    return issues;
  };

  const validationIssues = validateViewDefinition();
  const isValid = validationIssues.length === 0;

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ViewDefinition Generated
        </h2>
        <p className="text-sm text-green-800">
          Your SQL-on-FHIR ViewDefinition has been generated successfully. Review, validate, and execute it below.
        </p>
      </div>

      {/* View Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{viewDefinition.name}</span>
            <div className="flex items-center gap-2">
              {isValid ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {validationIssues.length} Issues
                </Badge>
              )}
              <Badge variant="outline">{viewDefinition.status}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resource Type</p>
              <p className="font-mono">{viewDefinition.resource}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Columns</p>
              <p className="font-mono">{viewDefinition.select?.reduce((sum: number, sel: any) => sum + (sel.column?.length || 0), 0) || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Where Clauses</p>
              <p className="font-mono">{viewDefinition.where?.length || 0}</p>
            </div>
          </div>
          
          {viewDefinition.description && (
            <p className="text-sm text-muted-foreground">{viewDefinition.description}</p>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCopyDefinition} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
            <Button onClick={handleDownloadDefinition} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {onExecuteView && (
              <Button onClick={handleExecuteView} variant="default" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Execute View
              </Button>
            )}
            <Button onClick={onNewViewDefinition} variant="outline" size="sm">
              Start New
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Issues */}
      {!isValid && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validation Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {validationIssues.map((issue, index) => (
                <li key={index} className="text-sm text-red-600">{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="definition">ViewDefinition JSON</TabsTrigger>
          <TabsTrigger value="sql">Generated SQL</TabsTrigger>
          <TabsTrigger value="execution">Execution Results</TabsTrigger>
        </TabsList>

        <TabsContent value="definition" className="space-y-4">
          <JsonViewer
            data={viewDefinition}
            title="ViewDefinition JSON"
            downloadFileName={`${viewDefinition.name || 'viewdefinition'}.json`}
            height="600px"
          />
        </TabsContent>

        <TabsContent value="sql" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated SQL</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                {generateSQL()}
              </pre>
              <Button 
                onClick={() => copyToClipboard(generateSQL())} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Copy SQL
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          {executionResults ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Execution Results
                  {executionResults.success ? (
                    <Badge variant="default" className="bg-green-600">Success</Badge>
                  ) : (
                    <Badge variant="destructive">Error</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {executionResults.success ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Query executed successfully. Found {executionResults.results?.length || 0} rows.
                    </p>
                    {executionResults.results && executionResults.results.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              {Object.keys(executionResults.results[0]).map((key) => (
                                <th key={key} className="border border-gray-300 px-2 py-1 text-left text-xs font-medium">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {executionResults.results.slice(0, 10).map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, colIndex) => (
                                  <td key={colIndex} className="border border-gray-300 px-2 py-1 text-xs">
                                    {value?.toString() || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {executionResults.results.length > 10 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Showing first 10 of {executionResults.results.length} rows
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p className="font-medium">Execution failed:</p>
                    <p className="text-sm mt-1">{executionResults.error}</p>
                  </div>
                )}
                
                {executionResults.executedSql && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium">Show executed SQL</summary>
                    <pre className="bg-gray-50 p-2 rounded mt-2 text-xs overflow-x-auto">
                      {executionResults.executedSql}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Execution Results</h3>
                <p className="text-muted-foreground mb-4">Click "Execute View" to test your ViewDefinition</p>
                {onExecuteView && (
                  <Button onClick={handleExecuteView}>
                    <Play className="h-4 w-4 mr-2" />
                    Execute View
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
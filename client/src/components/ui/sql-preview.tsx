import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Play, Eye, EyeOff, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SQLPreviewProps {
  viewDefinition: any;
  generatedSQL?: string;
  onExecute?: () => void;
  isExecuting?: boolean;
  executionResults?: {
    success: boolean;
    results?: any[];
    error?: string;
    suggestions?: string[];
    executedSql?: string;
  };
}

export const SQLPreview: React.FC<SQLPreviewProps> = ({
  viewDefinition,
  generatedSQL,
  onExecute,
  isExecuting = false,
  executionResults
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "SQL query has been copied to your clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (!executionResults) return <Info className="h-4 w-4 text-blue-500" />;
    if (executionResults.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (!executionResults) return "Ready to execute";
    if (executionResults.success) return `Success - ${executionResults.results?.length || 0} rows returned`;
    return `Error - ${executionResults.error}`;
  };

  const getStatusVariant = () => {
    if (!executionResults) return "secondary";
    if (executionResults.success) return "default";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            SQL Preview
            {getStatusIcon()}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              size="sm"
              variant="ghost"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ViewDefinition Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">ViewDefinition Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Name:</span> {viewDefinition.name || 'Unnamed'}
            </div>
            <div>
              <span className="font-medium">Resource:</span> {viewDefinition.resource}
            </div>
            <div>
              <span className="font-medium">Columns:</span> {viewDefinition.select?.reduce((total: number, selectItem: any) => total + (selectItem.column?.length || 0), 0) || 0}
            </div>
          </div>
        </div>

        {/* Generated SQL */}
        {generatedSQL && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Generated SQL</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(generatedSQL)}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                {onExecute && (
                  <Button
                    onClick={onExecute}
                    size="sm"
                    disabled={isExecuting}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isExecuting ? 'Executing...' : 'Execute'}
                  </Button>
                )}
              </div>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{generatedSQL}</code>
            </pre>
          </div>
        )}

        {/* Execution Results */}
        {executionResults && (
          <div className="space-y-3">
            {executionResults.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Execution Results</h3>
                <p className="text-sm text-green-700 mb-3">
                  Query executed successfully. Returned {executionResults.results?.length || 0} rows.
                </p>
                {executionResults.results && executionResults.results.length > 0 && showDetails && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead className="bg-green-100">
                        <tr>
                          {Object.keys(executionResults.results[0]).map((key) => (
                            <th key={key} className="border px-2 py-1 text-left">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {executionResults.results.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            {Object.values(row).map((value, valueIndex) => (
                              <td key={valueIndex} className="border px-2 py-1">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {executionResults.results.length > 5 && (
                      <p className="text-xs text-green-600 mt-2">
                        Showing first 5 rows of {executionResults.results.length} total results
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-800 mb-2">Execution Error</h3>
                <p className="text-sm text-red-700 mb-3">{executionResults.error}</p>
                
                {executionResults.suggestions && executionResults.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-800">Suggestions:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {executionResults.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {executionResults.executedSql && showDetails && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-800 mb-2">Executed SQL:</h4>
                    <pre className="bg-red-100 text-red-800 p-3 rounded text-xs overflow-x-auto">
                      <code>{executionResults.executedSql}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ViewDefinition Validation */}
        {showDetails && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">ViewDefinition Validation</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Resource type: {viewDefinition.resource}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Status: {viewDefinition.status}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Select clauses: {viewDefinition.select?.length || 0}
              </div>
              {viewDefinition.where && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Where clauses: {viewDefinition.where.length}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
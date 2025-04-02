import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Code, Download, Clipboard, CheckCircle } from 'lucide-react';
import { downloadJson } from '@/lib/fhir-utils';

interface SqlExporterProps {
  standardSql: string;
  platformSql?: {
    databricks?: string;
    bigquery?: string;
    snowflake?: string;
    postgres?: string;
    sqlserver?: string;
  };
  className?: string;
}

export const SqlExporter: React.FC<SqlExporterProps> = ({
  standardSql,
  platformSql,
  className
}) => {
  const [activeTab, setActiveTab] = useState('standard');
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({});

  // If no platform-specific SQL is provided, use the standard SQL
  const finalPlatformSql = platformSql || {
    databricks: standardSql,
    bigquery: standardSql,
    snowflake: standardSql,
    postgres: standardSql,
    sqlserver: standardSql
  };

  const platformLabels: Record<string, string> = {
    standard: 'Standard SQL',
    databricks: 'Databricks',
    bigquery: 'BigQuery',
    snowflake: 'Snowflake',
    postgres: 'PostgreSQL',
    sqlserver: 'SQL Server'
  };

  const handleCopyToClipboard = async (sql: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedState({...copiedState, [platform]: true});
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedState({...copiedState, [platform]: false});
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = (sql: string, platform: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${platform}-fhir-view-${timestamp}.sql`;
    
    // Create a Blob from the SQL string
    const blob = new Blob([sql], { type: 'text/plain' });
    
    // Create a link element
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Determine available platforms
  const platforms = Object.keys(finalPlatformSql).filter(p => finalPlatformSql[p as keyof typeof finalPlatformSql]);
  platforms.unshift('standard'); // Always have standard SQL first

  return (
    <div className={`border border-muted rounded-md overflow-hidden ${className}`}>
      <div className="bg-muted px-4 py-3 border-b border-muted flex justify-between items-center">
        <h3 className="text-md font-medium flex items-center">
          <Code className="h-4 w-4 mr-2" />
          SQL Export
        </h3>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(platforms.length, 6)}, 1fr)` }}>
          {platforms.map(platform => (
            <TabsTrigger key={platform} value={platform}>
              {platformLabels[platform] || platform}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="standard" className="m-0">
          <div className="bg-slate-50 p-4 relative">
            <div className="absolute top-4 right-4 space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleCopyToClipboard(standardSql, 'standard')}
              >
                {copiedState['standard'] ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clipboard className="h-4 w-4" />
                )}
                <span className="ml-1">{copiedState['standard'] ? 'Copied!' : 'Copy'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleDownload(standardSql, 'standard')}
              >
                <Download className="h-4 w-4" />
                <span className="ml-1">Download</span>
              </Button>
            </div>
            <pre className="text-sm text-neutral-800 font-mono overflow-auto max-h-[300px] pt-8">
              {standardSql}
            </pre>
          </div>
        </TabsContent>
        
        {Object.entries(finalPlatformSql).map(([platform, sql]) => (
          platform !== 'standard' && (
            <TabsContent key={platform} value={platform} className="m-0">
              <div className="bg-slate-50 p-4 relative">
                <div className="absolute top-4 right-4 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleCopyToClipboard(sql || '', platform)}
                  >
                    {copiedState[platform] ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                    <span className="ml-1">{copiedState[platform] ? 'Copied!' : 'Copy'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleDownload(sql || '', platform)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="ml-1">Download</span>
                  </Button>
                </div>
                <pre className="text-sm text-neutral-800 font-mono overflow-auto max-h-[300px] pt-8">
                  {sql}
                </pre>
              </div>
            </TabsContent>
          )
        ))}
      </Tabs>
    </div>
  );
};

export default SqlExporter;
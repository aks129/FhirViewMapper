import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clipboard, Download } from 'lucide-react';
import { copyToClipboard, downloadJson } from '@/lib/fhir-utils';
import { useToast } from '@/hooks/use-toast';

interface JsonViewerProps {
  data: any;
  title?: string;
  downloadFileName?: string;
  className?: string;
  height?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title = 'JSON Data',
  downloadFileName = 'data.json',
  className = '',
  height = '500px',
}) => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(JSON.stringify(data, null, 2));
    
    if (success) {
      setIsCopied(true);
      toast({
        title: 'Copied to clipboard',
        description: 'The JSON data has been copied to your clipboard.',
        duration: 3000,
      });
      
      // Reset the copied state after a short delay
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    downloadJson(data, downloadFileName);
    
    toast({
      title: 'Download started',
      description: `Downloading ${downloadFileName}`,
      duration: 3000,
    });
  };

  // Function to format different data types
  const formatValue = (value: any): JSX.Element => {
    if (value === null) return <span className="text-gray-500">null</span>;
    
    switch (typeof value) {
      case 'string':
        return <span className="text-green-600">"{value}"</span>;
      case 'number':
        return <span className="text-blue-600">{value}</span>;
      case 'boolean':
        return <span className="text-red-600">{value.toString()}</span>;
      default:
        return <span>{JSON.stringify(value)}</span>;
    }
  };

  const renderJsonTree = (obj: any, indent: number = 0): JSX.Element[] => {
    return Object.entries(obj).map(([key, value], index) => {
      const isComplex = value !== null && typeof value === 'object';
      
      return (
        <div key={`${key}-${index}`} style={{ marginLeft: `${indent * 20}px` }}>
          <span className="text-primary font-medium">"{key}"</span>: {
            isComplex ? (
              <>
                {Array.isArray(value) ? '[' : '{'}
                <div>
                  {renderJsonTree(Array.isArray(value) ? 
                    Object.fromEntries(value.map((v, i) => [i, v])) : 
                    value, 
                    indent + 1
                  )}
                </div>
                <div style={{ marginLeft: `${indent * 20}px` }}>{Array.isArray(value) ? ']' : '}'}{index < Object.entries(obj).length - 1 ? ',' : ''}</div>
              </>
            ) : (
              <>{formatValue(value)}{index < Object.entries(obj).length - 1 ? ',' : ''}</>
            )
          }
        </div>
      );
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="px-4 py-2 flex flex-row items-center justify-between">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-8">
            <Clipboard className="h-4 w-4 mr-1" />
            {isCopied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-8">
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          className="bg-neutral-800 text-white p-4 rounded-b-md overflow-auto font-mono text-sm"
          style={{ maxHeight: height }}
        >
          <div className="whitespace-pre-wrap">
            {'{'}
            {renderJsonTree(data)}
            {'}'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

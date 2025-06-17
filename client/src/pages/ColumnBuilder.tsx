import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Info, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { Profile, ImplementationGuide } from '@/lib/types';
import { validateFHIRPath, getPathSuggestions, getFHIRPathExamples, FHIRPathSuggestion } from '@/lib/fhirpath-validator';

interface ColumnDefinition {
  id: string;
  name: string;
  path: string;
  description?: string;
  type?: string;
  cardinality?: string;
  mustSupport?: boolean;
  forEach?: boolean;
  forEachOrNull?: boolean;
  unionAll?: boolean;
  isConstant?: boolean;
  constantValue?: string;
}

interface WhereClause {
  id: string;
  path: string;
  description?: string;
}

interface ColumnBuilderProps {
  implementationGuide?: ImplementationGuide;
  profile?: Profile;
  onGenerateViewDefinition: (viewDefinition: any) => void;
}

export const ColumnBuilder: React.FC<ColumnBuilderProps> = ({
  implementationGuide,
  profile,
  onGenerateViewDefinition
}) => {
  const [, setLocation] = useLocation();
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [viewName, setViewName] = useState('');
  const [viewTitle, setViewTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      // Initialize with common FHIR resource columns
      const defaultColumns: ColumnDefinition[] = [
        {
          id: 'id',
          name: 'id',
          path: 'getResourceKey()',
          description: 'Resource identifier',
          type: 'id',
          cardinality: '0..1',
          mustSupport: true
        },
        {
          id: 'resource_type',
          name: 'resource_type',
          path: 'resourceType',
          description: 'FHIR resource type',
          type: 'code',
          cardinality: '1..1',
          mustSupport: true
        }
      ];

      // Add profile-specific columns based on resource type
      if (profile.resourceType === 'Patient') {
        defaultColumns.push(
          {
            id: 'active',
            name: 'active',
            path: 'active',
            description: 'Whether this patient record is in active use',
            type: 'boolean',
            cardinality: '0..1',
            mustSupport: false
          },
          {
            id: 'family_name',
            name: 'family_name',
            path: 'name.where(use = \'official\').family.first()',
            description: 'Family name (surname)',
            type: 'string',
            cardinality: '0..1',
            mustSupport: true
          },
          {
            id: 'given_name',
            name: 'given_name',
            path: 'name.where(use = \'official\').given.first()',
            description: 'Given name (first name)',
            type: 'string',
            cardinality: '0..*',
            mustSupport: true
          },
          {
            id: 'birth_date',
            name: 'birth_date',
            path: 'birthDate',
            description: 'Date of birth',
            type: 'date',
            cardinality: '0..1',
            mustSupport: false
          },
          {
            id: 'gender',
            name: 'gender',
            path: 'gender',
            description: 'Administrative gender',
            type: 'code',
            cardinality: '0..1',
            mustSupport: true
          }
        );
      } else if (profile.resourceType === 'Observation') {
        defaultColumns.push(
          {
            id: 'status',
            name: 'status',
            path: 'status',
            description: 'Observation status',
            type: 'code',
            cardinality: '1..1',
            mustSupport: true
          },
          {
            id: 'code',
            name: 'code',
            path: 'code.coding.where(system = \'http://loinc.org\').code.first()',
            description: 'LOINC code for the observation',
            type: 'code',
            cardinality: '1..1',
            mustSupport: true
          },
          {
            id: 'value_quantity',
            name: 'value_quantity',
            path: 'value.ofType(Quantity).value',
            description: 'Numerical value',
            type: 'decimal',
            cardinality: '0..1',
            mustSupport: false
          },
          {
            id: 'value_unit',
            name: 'value_unit',
            path: 'value.ofType(Quantity).unit',
            description: 'Unit of measurement',
            type: 'string',
            cardinality: '0..1',
            mustSupport: false
          }
        );
      }

      setColumns(defaultColumns);
      setViewName(`${profile.resourceType}View`);
      setViewTitle(`${profile.name} View`);
      setDescription(`SQL-on-FHIR view for ${profile.name}`);

      // Add default where clause for profile filtering
      setWhereClauses([{
        id: 'profile_filter',
        path: `meta.profile.where($this = '${profile.url}').exists()`,
        description: 'Filter resources that conform to this profile'
      }]);
    }
  }, [profile]);

  const addColumn = () => {
    const newColumn: ColumnDefinition = {
      id: `column_${Date.now()}`,
      name: '',
      path: '',
      description: '',
      type: 'string',
      cardinality: '0..1',
      mustSupport: false
    };
    setColumns([...columns, newColumn]);
  };

  const updateColumn = (id: string, updates: Partial<ColumnDefinition>) => {
    // Validate FHIRPath if path is being updated
    if (updates.path !== undefined && profile) {
      const validation = validateFHIRPath(updates.path, profile.resourceType);
      setValidationErrors(prev => ({
        ...prev,
        [id]: validation.isValid ? '' : validation.error || 'Invalid FHIRPath expression'
      }));
    }
    
    setColumns(columns.map(col => col.id === id ? { ...col, ...updates } : col));
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
  };

  const addWhereClause = () => {
    const newClause: WhereClause = {
      id: `where_${Date.now()}`,
      path: '',
      description: ''
    };
    setWhereClauses([...whereClauses, newClause]);
  };

  const updateWhereClause = (id: string, updates: Partial<WhereClause>) => {
    setWhereClauses(whereClauses.map(clause => clause.id === id ? { ...clause, ...updates } : clause));
  };

  const removeWhereClause = (id: string) => {
    setWhereClauses(whereClauses.filter(clause => clause.id !== id));
  };

  const generateViewDefinition = () => {
    const viewDefinition = {
      resourceType: "ViewDefinition",
      id: viewName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: viewName,
      title: viewTitle,
      status: "draft",
      description: description,
      resource: profile?.resourceType,
      select: columns.filter(col => col.name && col.path).map(col => {
        const selectItem: any = {
          column: [
            {
              name: col.name,
              path: col.path,
              description: col.description,
              type: col.type
            }
          ]
        };

        if (col.forEach) selectItem.forEach = col.path;
        if (col.forEachOrNull) selectItem.forEachOrNull = col.path;
        if (col.unionAll) selectItem.unionAll = true;

        return selectItem;
      }),
      where: whereClauses.filter(clause => clause.path).map(clause => ({
        path: clause.path,
        description: clause.description
      }))
    };

    onGenerateViewDefinition(viewDefinition);
    // Automatically navigate to the view definition viewer
    setLocation('/builder/view-definition');
  };

  if (!profile) {
    return (
      <div className="text-center p-8">
        <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Profile Selected</h3>
        <p className="text-muted-foreground">Please select a profile to begin building your ViewDefinition.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">ViewDefinition Builder</h2>
        <p className="text-sm text-blue-800">
          Configure columns and filters for your SQL-on-FHIR ViewDefinition based on {profile.name}
        </p>
      </div>

      {/* View Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>View Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="viewName">View Name</Label>
              <Input
                id="viewName"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="e.g., PatientView"
              />
            </div>
            <div>
              <Label htmlFor="viewTitle">View Title</Label>
              <Input
                id="viewTitle"
                value={viewTitle}
                onChange={(e) => setViewTitle(e.target.value)}
                placeholder="e.g., US Core Patient View"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this view..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Resource Type: {profile.resourceType}</Badge>
            <Badge variant="outline">Profile: {profile.name}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Column Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Select Columns
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowExamples(!showExamples)} 
                size="sm" 
                variant="ghost"
                className="text-blue-600 hover:text-blue-700"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                {showExamples ? 'Hide' : 'Show'} Examples
              </Button>
              <Button onClick={addColumn} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* FHIRPath Examples Panel */}
          {showExamples && profile && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">FHIRPath Examples for {profile.resourceType}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFHIRPathExamples(profile.resourceType).map((category, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-800">{category.category}</h4>
                    <div className="space-y-1">
                      {category.examples.map((example, exampleIndex) => (
                        <div 
                          key={exampleIndex}
                          className="cursor-pointer text-xs p-2 bg-white border border-blue-100 rounded hover:bg-blue-50"
                          onClick={() => {
                            const emptyColumn = columns.find(col => !col.path);
                            if (emptyColumn) {
                              updateColumn(emptyColumn.id, { 
                                path: example.path,
                                name: example.path.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
                                description: example.description
                              });
                            }
                          }}
                        >
                          <code className="text-purple-700">{example.path}</code>
                          <p className="text-gray-600 mt-1">{example.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {columns.map((column) => (
              <div key={column.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={column.mustSupport ? "default" : "secondary"}>
                      {column.mustSupport ? "Must Support" : "Optional"}
                    </Badge>
                    {column.cardinality && (
                      <Badge variant="outline">{column.cardinality}</Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => removeColumn(column.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Column Name</Label>
                    <Input
                      value={column.name}
                      onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                      placeholder="e.g., patient_id"
                    />
                  </div>
                  <div>
                    <Label>FHIRPath Expression</Label>
                    <div className="relative">
                      <Input
                        value={column.path}
                        onChange={(e) => updateColumn(column.id, { path: e.target.value })}
                        placeholder="e.g., name.family.first()"
                        className={`font-mono text-sm pr-8 ${
                          validationErrors[column.id] ? 'border-red-500' : 
                          column.path && !validationErrors[column.id] ? 'border-green-500' : ''
                        }`}
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        {validationErrors[column.id] ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : column.path && !validationErrors[column.id] ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    </div>
                    {validationErrors[column.id] && (
                      <p className="text-sm text-red-600 mt-1">
                        {validationErrors[column.id]}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={column.description || ''}
                    onChange={(e) => updateColumn(column.id, { description: e.target.value })}
                    placeholder="Describe this column..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${column.id}-forEach`}
                      checked={column.forEach || false}
                      onCheckedChange={(checked) => updateColumn(column.id, { forEach: checked as boolean })}
                    />
                    <Label htmlFor={`${column.id}-forEach`} className="text-sm">forEach</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${column.id}-forEachOrNull`}
                      checked={column.forEachOrNull || false}
                      onCheckedChange={(checked) => updateColumn(column.id, { forEachOrNull: checked as boolean })}
                    />
                    <Label htmlFor={`${column.id}-forEachOrNull`} className="text-sm">forEachOrNull</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${column.id}-unionAll`}
                      checked={column.unionAll || false}
                      onCheckedChange={(checked) => updateColumn(column.id, { unionAll: checked as boolean })}
                    />
                    <Label htmlFor={`${column.id}-unionAll`} className="text-sm">unionAll</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Where Clauses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Where Clauses
            <Button onClick={addWhereClause} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {whereClauses.map((clause) => (
              <div key={clause.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Filter Expression</Label>
                  <Button
                    onClick={() => removeWhereClause(clause.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>FHIRPath Expression</Label>
                    <Input
                      value={clause.path}
                      onChange={(e) => updateWhereClause(clause.id, { path: e.target.value })}
                      placeholder="e.g., status = 'active'"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={clause.description || ''}
                      onChange={(e) => updateWhereClause(clause.id, { description: e.target.value })}
                      placeholder="Describe this filter..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button onClick={generateViewDefinition} size="lg" className="w-full md:w-auto">
          Generate ViewDefinition
        </Button>
      </div>
    </div>
  );
};
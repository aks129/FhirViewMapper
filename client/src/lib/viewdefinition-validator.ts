/**
 * ViewDefinition validation utilities for HL7 SQL-on-FHIR compliance
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ViewDefinitionColumn {
  name: string;
  path: string;
  description?: string;
  type?: string;
  nestedPath?: string;
  isNested?: boolean;
}

export interface ViewDefinitionSelect {
  column: ViewDefinitionColumn[];
  forEach?: string;
  forEachOrNull?: string;
  unionAll?: boolean;
  join?: {
    type: 'inner' | 'left' | 'right' | 'full';
    table: string;
    condition: string;
  };
}

export interface ViewDefinitionWhere {
  expression: string;
  description?: string;
}

export interface ViewDefinition {
  resourceType: "ViewDefinition";
  id: string;
  name: string;
  title?: string;
  status: "draft" | "active" | "retired";
  description?: string;
  resource: string;
  select: ViewDefinitionSelect[];
  where?: ViewDefinitionWhere[];
  extension?: any[];
}

/**
 * Validate a ViewDefinition against HL7 SQL-on-FHIR specification
 */
export function validateViewDefinition(viewDef: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!viewDef.resourceType || viewDef.resourceType !== "ViewDefinition") {
    errors.push("resourceType must be 'ViewDefinition'");
  }

  if (!viewDef.id || typeof viewDef.id !== 'string') {
    errors.push("id is required and must be a string");
  } else if (!/^[a-z0-9\-]+$/.test(viewDef.id)) {
    warnings.push("id should only contain lowercase letters, numbers, and hyphens");
  }

  if (!viewDef.name || typeof viewDef.name !== 'string') {
    errors.push("name is required and must be a string");
  }

  if (!viewDef.status || !['draft', 'active', 'retired'].includes(viewDef.status)) {
    errors.push("status must be one of: draft, active, retired");
  }

  if (!viewDef.resource || typeof viewDef.resource !== 'string') {
    errors.push("resource is required and must be a valid FHIR resource type");
  }

  // Select array validation
  if (!Array.isArray(viewDef.select)) {
    errors.push("select must be an array");
  } else if (viewDef.select.length === 0) {
    errors.push("select array cannot be empty - at least one column is required");
  } else {
    viewDef.select.forEach((selectItem: any, index: number) => {
      validateSelectItem(selectItem, index, errors, warnings);
    });
  }

  // Where array validation (optional)
  if (viewDef.where && !Array.isArray(viewDef.where)) {
    errors.push("where must be an array if provided");
  } else if (viewDef.where) {
    viewDef.where.forEach((whereItem: any, index: number) => {
      validateWhereItem(whereItem, index, errors, warnings);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function validateSelectItem(selectItem: any, index: number, errors: string[], warnings: string[]) {
  const prefix = `select[${index}]`;

  if (!Array.isArray(selectItem.column)) {
    errors.push(`${prefix}.column must be an array`);
    return;
  }

  if (selectItem.column.length === 0) {
    errors.push(`${prefix}.column array cannot be empty`);
    return;
  }

  selectItem.column.forEach((col: any, colIndex: number) => {
    const colPrefix = `${prefix}.column[${colIndex}]`;

    if (!col.name || typeof col.name !== 'string') {
      errors.push(`${colPrefix}.name is required and must be a string`);
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.name)) {
      warnings.push(`${colPrefix}.name should be a valid SQL identifier`);
    }

    if (!col.path || typeof col.path !== 'string') {
      errors.push(`${colPrefix}.path is required and must be a FHIRPath expression`);
    }

    if (col.type && !['string', 'boolean', 'integer', 'decimal', 'date', 'dateTime', 'time', 'code', 'uri', 'canonical', 'base64Binary', 'instant', 'oid', 'id', 'markdown', 'unsignedInt', 'positiveInt'].includes(col.type)) {
      warnings.push(`${colPrefix}.type '${col.type}' is not a standard FHIR data type`);
    }
  });

  // Validate forEach/forEachOrNull mutual exclusivity
  if (selectItem.forEach && selectItem.forEachOrNull) {
    warnings.push(`${prefix}: forEach and forEachOrNull should not both be specified`);
  }

  // Validate join configuration
  if (selectItem.join) {
    if (!selectItem.join.type || !['inner', 'left', 'right', 'full'].includes(selectItem.join.type)) {
      errors.push(`${prefix}.join.type must be one of: inner, left, right, full`);
    }

    if (!selectItem.join.table || typeof selectItem.join.table !== 'string') {
      errors.push(`${prefix}.join.table is required for join configuration`);
    }

    if (!selectItem.join.condition || typeof selectItem.join.condition !== 'string') {
      errors.push(`${prefix}.join.condition is required for join configuration`);
    }
  }
}

function validateWhereItem(whereItem: any, index: number, errors: string[], warnings: string[]) {
  const prefix = `where[${index}]`;

  if (!whereItem.expression || typeof whereItem.expression !== 'string') {
    errors.push(`${prefix}.expression is required and must be a FHIRPath expression`);
  }
}

/**
 * Generate a valid example ViewDefinition for testing
 */
export function generateExampleViewDefinition(resourceType: string = 'Patient'): ViewDefinition {
  return {
    resourceType: "ViewDefinition",
    id: `${resourceType.toLowerCase()}-basic-view`,
    name: `${resourceType}BasicView`,
    title: `${resourceType} Basic Information View`,
    status: "draft",
    description: `Basic information view for ${resourceType} resources`,
    resource: resourceType,
    select: [
      {
        column: [
          {
            name: "id",
            path: "getResourceKey()",
            description: "Resource identifier",
            type: "id"
          }
        ]
      },
      {
        column: [
          {
            name: "active",
            path: "active",
            description: "Whether this patient record is in active use",
            type: "boolean"
          }
        ]
      }
    ],
    where: [
      {
        expression: "active = true",
        description: "Only include active records"
      }
    ]
  };
}

/**
 * Convert ViewDefinition to SQL preview
 */
export function generateSQLPreview(viewDef: ViewDefinition): string {
  const columns = viewDef.select.flatMap(select => 
    select.column.map(col => {
      let sqlPath = col.path;
      
      // Convert FHIRPath to SQL-like syntax
      if (sqlPath.includes('.')) {
        sqlPath = `json_extract(resource, '$.${sqlPath.replace(/\./g, '.')}')`;
      }
      
      return `  ${sqlPath} AS ${col.name}`;
    })
  );

  let sql = `SELECT\n${columns.join(',\n')}\nFROM ${viewDef.resource}`;

  if (viewDef.where && viewDef.where.length > 0) {
    const whereConditions = viewDef.where.map(w => {
      let condition = w.expression;
      // Convert FHIRPath boolean expressions to SQL
      if (condition.includes(' = ')) {
        const [path, value] = condition.split(' = ');
        condition = `json_extract(resource, '$.${path.trim()}') = ${value.trim()}`;
      }
      return `  ${condition}`;
    });
    
    sql += `\nWHERE\n${whereConditions.join(' AND\n')}`;
  }

  return sql;
}
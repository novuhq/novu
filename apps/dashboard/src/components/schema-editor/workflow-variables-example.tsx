import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/primitives/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Label } from '@/components/primitives/label';
import { Input } from '@/components/primitives/input';
import { useSchemaForm } from './use-schema-form';
import type { JSONSchema7 } from './json-schema';
import { SchemaEditor } from './schema-editor';

interface WorkflowSectionProps {
  initialSchema?: JSONSchema7;
  onSchemaChange?: (schema: JSONSchema7) => void;
}

type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export function WorkflowVariableSection({ initialSchema, onSchemaChange }: WorkflowSectionProps) {
  const [isSchemaEditorOpen, setIsSchemaEditorOpen] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<VariableType>('string');
  const [currentSchema, setCurrentSchema] = useState<JSONSchema7 | undefined>(initialSchema);

  // Use the headless schema form hook
  const { addProperty, getCurrentSchema } = useSchemaForm({
    initialSchema,
    onChange: (schema) => {
      setCurrentSchema(schema);

      if (onSchemaChange) {
        onSchemaChange(schema);
      }
    },
  });

  // Handle adding a variable directly
  const handleAddVariable = () => {
    if (!newVarName.trim()) return;

    addProperty(
      {
        keyName: newVarName.trim(),
        isRequired: false,
      },
      newVarType
    );

    setNewVarName('');
  };

  // Get variable names from the schema
  const getVariablesList = () => {
    if (!currentSchema?.properties) return [];

    return Object.entries(currentSchema.properties).map(([key, value]) => ({
      name: key,
      type: (value as JSONSchema7).type || 'string',
      required: currentSchema.required?.includes(key) || false,
    }));
  };

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="mb-4 flex justify-between">
        <h2 className="text-lg font-semibold">Workflow Variables</h2>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm">
                Quick Add Variable
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex flex-col gap-4 p-2">
                <div>
                  <Label htmlFor="varName">Variable Name</Label>
                  <Input
                    id="varName"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="myVariable"
                  />
                </div>

                <div>
                  <Label htmlFor="varType">Variable Type</Label>
                  <select
                    id="varType"
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={newVarType}
                    onChange={(e) => setNewVarType(e.target.value as VariableType)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="object">Object</option>
                    <option value="array">Array</option>
                  </select>
                </div>

                <Button onClick={handleAddVariable}>Add Variable</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={isSchemaEditorOpen} onOpenChange={setIsSchemaEditorOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                Advanced Editor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Schema Editor</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <SchemaEditor
                  initialSchema={currentSchema}
                  onChange={(schema) => {
                    setCurrentSchema(schema);

                    if (onSchemaChange) {
                      onSchemaChange(schema);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsSchemaEditorOpen(false)}>Done</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 font-medium">Current Variables:</h3>
        <div className="overflow-hidden rounded border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Required
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {getVariablesList().map((variable) => (
                <tr key={variable.name}>
                  <td className="px-4 py-2 text-sm">{variable.name}</td>
                  <td className="px-4 py-2 text-sm">{variable.type}</td>
                  <td className="px-4 py-2 text-sm">{variable.required ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {getVariablesList().length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                    No variables defined yet. Add your first variable using the buttons above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded bg-gray-50 p-3 text-xs">
        <div className="mb-1 font-medium">Schema JSON:</div>
        <pre className="max-h-40 overflow-auto">{JSON.stringify(currentSchema, null, 2)}</pre>
      </div>
    </div>
  );
}

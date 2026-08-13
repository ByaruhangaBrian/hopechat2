"use client";

import {
  PERMISSION_DEFINITIONS,
  type Permissions,
  type PermissionKey,
} from "@/lib/permissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PermissionsEditorProps {
  value: Permissions;
  onChange: (next: Permissions) => void;
  disabled?: boolean;
}

export function PermissionsEditor({
  value,
  onChange,
  disabled = false,
}: PermissionsEditorProps) {
  function toggle(key: PermissionKey) {
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <div className="space-y-2.5">
      {PERMISSION_DEFINITIONS.map((def) => (
        <div
          key={def.key}
          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
        >
          <div className="space-y-0.5">
            <Label
              htmlFor={`perm-${def.key}`}
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              {def.label}
            </Label>
            <p className="text-xs text-muted-foreground/70">{def.description}</p>
          </div>
          <Switch
            id={`perm-${def.key}`}
            checked={value[def.key]}
            onCheckedChange={() => toggle(def.key)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

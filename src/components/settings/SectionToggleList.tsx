/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { EstimateSection, SectionType } from "./EstimateDefaultsForm";

interface SectionToggleListProps {
  sections: EstimateSection[];
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  onToggle: (sectionId: string) => void;
  onLabelChange: (sectionId: string, label: string) => void;
  onAddSection: (label: string, type: SectionType) => void;
  onRemoveSection: (sectionId: string) => void;
  setSectionUpdates: React.Dispatch<React.SetStateAction<EstimateSection[]>>
}

const SectionToggleList: React.FC<SectionToggleListProps> = ({
  sections,
  activeSectionId,
  setActiveSectionId,
  onToggle,
  onLabelChange,
  onAddSection,
  onRemoveSection,
  setSectionUpdates,
}) => {
  // For adding new section
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<SectionType>("text");
  const [editLabelId, setEditLabelId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <form
          className="flex items-center gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newLabel.trim()) return;
            onAddSection(newLabel.trim(), newType);
            setNewLabel("");
          }}
        >
          <input
            className="border rounded px-2 py-1 w-32"
            placeholder="Section title"
            value={newLabel}
            maxLength={32}
            onChange={(e) => setNewLabel(e.target.value)}
            required
          />
          <select
            className="border rounded px-2 py-1"
            value={newType}
            onChange={(e) => setNewType(e.target.value as SectionType)}
          >
            <option value="text">Text</option>
            <option value="file">File Upload</option>
          </select>
          <Button type="submit" size="sm" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>
      {sections.map((section, index) => (
        <div
          key={section.id}
          className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition ${
            activeSectionId === section.id
              ? "bg-red-50 border border-red-200"
              : ""
          }`}
          onClick={() => setActiveSectionId(section.id)}
        >
          {/* Section label (+ edit) */}
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            {editLabelId === section.id ? (
              <input
                type="text"
                className="border rounded px-1 py-1 text-lg font-bold w-36"
                value={section.title}
                maxLength={32}
                onChange={(e) =>
                  setSectionUpdates((oldSections) => {
                    return oldSections.map((sec) =>
                      sec.id === section.id
                        ? { ...sec, title: e.target.value }
                        : sec
                    );
                  })
                }
                onBlur={() => {
                  if (editLabel.trim()) onLabelChange(section.id, editLabel);
                  setEditLabelId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editLabel.trim()) {
                    onLabelChange(section.id, editLabel);
                    setEditLabelId(null);
                  }
                }}
                autoFocus
              />
            ) : (
              <>
                <Label
                  className="flex items-center gap-2 text-lg font-bold truncate select-none cursor-pointer"
                  onClick={() => setActiveSectionId(section.id)}
                  title={section.title}
                >
                  {section.title}
                </Label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditLabelId(section.id);
                    setEditLabel(section.title);
                  }}
                  tabIndex={0}
                >
                  <PencilLine className="h-4 w-4" />
                </Button>
                {/* <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSection(section.id);
                  }}
                  disabled={sections.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button> */}
              </>
            )}
          </div>
          <Switch
            checked={section.enabled}
            onCheckedChange={() => onToggle(section.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ))}
    </div>
  );
};

export default SectionToggleList;

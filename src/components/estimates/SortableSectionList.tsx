import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Settings, Eye, EyeOff } from 'lucide-react';
import { FormSectionConfig } from '@/services/estimates/form-engine-v2';

interface SortableSectionListProps {
  sections: FormSectionConfig[];
  activeSectionId?: string;
  onSectionSelect: (sectionId: string) => void;
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  onSectionsReorder: (sections: FormSectionConfig[]) => void;
  onSectionEdit?: (sectionId: string) => void;
}

interface SortableItemProps {
  section: FormSectionConfig;
  isActive: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit?: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  section,
  isActive,
  onSelect,
  onToggle,
  onEdit
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-primary' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing text-muted-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Section status indicator */}
          <div className="flex items-center gap-2 flex-1">
            {section.enabled ? (
              <Eye className="h-4 w-4 text-green-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            
            <div className="flex-1">
              <div className="font-medium text-sm">{section.label}</div>
              {section.description && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {section.description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={section.type === 'custom' ? 'secondary' : 'default'} className="text-xs">
                {section.type}
              </Badge>
              
              <Switch
                checked={section.enabled}
                onCheckedChange={onToggle}
                onClick={(e) => e.stopPropagation()}
              />
              
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SortableSectionList: React.FC<SortableSectionListProps> = ({
  sections,
  activeSectionId,
  onSectionSelect,
  onSectionToggle,
  onSectionsReorder,
  onSectionEdit
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((section) => section.id === active.id);
      const newIndex = sections.findIndex((section) => section.id === over.id);
      
      const reorderedSections = arrayMove(sections, oldIndex, newIndex).map((section, index) => ({
        ...section,
        sortOrder: index + 1
      }));
      
      onSectionsReorder(reorderedSections);
    }
  };

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableItem
              key={section.id}
              section={section}
              isActive={activeSectionId === section.id}
              onSelect={() => onSectionSelect(section.id)}
              onToggle={(enabled) => onSectionToggle(section.id, enabled)}
              onEdit={onSectionEdit ? () => onSectionEdit(section.id) : undefined}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SortableSectionList;
'use client';

import { Resource } from '@/types/resource';
import ResourceCard from './ResourceCard';

interface ResourceListProps {
  resources: Resource[];
  emptyMessage?: string;
  showActions?: boolean;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resourceId: string) => void;
}

export default function ResourceList({
  resources,
  emptyMessage = 'لا توجد مواد',
  showActions = false,
  onEdit,
  onDelete,
}: ResourceListProps) {
  // Sort resources by order field
  const sortedResources = [...resources].sort((a, b) => a.order - b.order);

  if (sortedResources.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {sortedResources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          showActions={showActions}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

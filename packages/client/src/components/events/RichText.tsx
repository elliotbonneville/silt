/**
 * Rich Text Renderer
 * Parses text content and replaces entity names with interactive elements
 */

import type { EntityReference } from '@silt/shared';
import { useMemo } from 'react';

interface RichTextProps {
  content: string;
  relatedEntities?: readonly EntityReference[] | undefined;
  onEntityClick?: ((entity: EntityReference) => void) | undefined;
  className?: string | undefined;
}

export function RichText({
  content,
  relatedEntities = [],
  onEntityClick,
  className,
}: RichTextProps): JSX.Element {
  const parts = useMemo(() => {
    if (!relatedEntities.length || !content) {
      return [content];
    }

    // Sort entities by name length (descending) to match longest names first
    // This prevents "Town" from matching inside "Town Guard"
    const sortedEntities = [...relatedEntities].sort((a, b) => b.name.length - a.name.length);

    // Create a regex pattern that matches any of the entity names
    // We escape special characters in names just in case
    const pattern = new RegExp(
      `(${sortedEntities.map((e) => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'g',
    );

    // Split content by the pattern
    const splitContent = content.split(pattern);

    // Map parts to elements
    return splitContent.map((part, i) => {
      // Check if this part matches an entity name
      const entity = sortedEntities.find((e) => e.name === part);

      if (entity) {
        return {
          type: 'entity',
          text: part,
          entity,
          key: `${part}-${i}`,
        };
      }

      return {
        type: 'text',
        text: part,
        key: `text-${i}`,
      };
    });
  }, [content, relatedEntities]);

  if (!onEntityClick || relatedEntities.length === 0) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part) => {
        if (typeof part === 'string') return part;

        if (part.type === 'entity' && part.entity) {
          return (
            <button
              key={part.key}
              type="button"
              onClick={() => onEntityClick(part.entity)}
              className="hover:bg-white/10 rounded px-0.5 -mx-0.5 cursor-pointer font-semibold transition-colors"
              title={`Click to target ${part.entity.name}`}
            >
              {part.text}
            </button>
          );
        }

        return <span key={part.key}>{part.text}</span>;
      })}
    </span>
  );
}

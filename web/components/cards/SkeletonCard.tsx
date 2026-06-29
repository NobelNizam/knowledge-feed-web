'use client';

import React from 'react';

export function SkeletonCard() {
  return (
    <article className="flex w-full border-b border-border/40 bg-background px-4 py-5 sm:px-6 animate-pulse">
      {/* Left column */}
      <div className="flex flex-col items-center mr-4">
        <div className="h-10 w-10 rounded-full bg-muted/65" />
        <div className="mt-2 w-0.5 grow rounded-full bg-muted/30 min-h-[60px]" />
      </div>
      
      {/* Right column */}
      <div className="flex w-full flex-col">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <div className="h-4 w-20 bg-muted/60 rounded-full" />
          <div className="h-3 w-12 bg-muted/40 rounded-full" />
        </div>
        
        {/* Title */}
        <div className="mt-3 h-5 w-3/4 bg-muted/75 rounded-md" />
        
        {/* Content Lines */}
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full bg-muted/50 rounded-md" />
          <div className="h-4 w-full bg-muted/50 rounded-md" />
          <div className="h-4 w-5/6 bg-muted/50 rounded-md" />
        </div>
        
        {/* Tags */}
        <div className="mt-4 flex gap-2">
          <div className="h-5 w-12 bg-muted/45 rounded-md" />
          <div className="h-5 w-16 bg-muted/45 rounded-md" />
        </div>
      </div>
    </article>
  );
}
export default SkeletonCard;

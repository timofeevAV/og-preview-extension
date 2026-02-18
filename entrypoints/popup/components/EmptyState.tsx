interface EmptyStateProps {
  variant: 'empty' | 'error';
}

export function EmptyState({ variant }: EmptyStateProps) {
  const isError = variant === 'error';
  return (
    <div className="flex w-[380px] flex-col items-center px-4 py-8 text-center">
      <p className="text-sm font-semibold">
        {isError ? "Can't access this page" : 'No OG metadata detected'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isError
          ? 'The extension cannot read metadata on this page.'
          : 'This page has no Open Graph meta tags.'}
      </p>
    </div>
  );
}

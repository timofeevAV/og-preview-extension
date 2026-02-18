export function TooltipErrorState() {
  return (
    <div className="p-4 text-center">
      <p className="text-sm font-medium text-foreground">
        No preview available
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        This page has no OG tags or could not be reached.
      </p>
    </div>
  );
}

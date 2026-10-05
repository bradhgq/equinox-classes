import { Button } from "../../components/Button/Button.tsx";

/** In the results header, beside the count: subscribe to this search in a calendar. */
export function SubscribeButton({ onOpen, disabled }: { onOpen: () => void; disabled: boolean }) {
  return (
    <Button size="sm" icon="calendar" disabled={disabled} onClick={onOpen} label="Subscribe to this search in your calendar" data-focus-key="subscribe">
      Subscribe
    </Button>
  );
}

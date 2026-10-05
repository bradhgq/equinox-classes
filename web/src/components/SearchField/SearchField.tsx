import { useRef } from "preact/hooks";
import { Icon } from "../Icon/Icon.tsx";
import styles from "./SearchField.module.css";

interface Props {
  value: string;
  onInput: (value: string) => void;
  placeholder: string;
  label: string;
  onFocusChange?: (focused: boolean) => void;
}

export function SearchField({ value, onInput, placeholder, label, onFocusChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div class={styles.field}>
      <Icon name="search" size={20} class={styles.icon} />
      <input
        ref={input}
        class={styles.input}
        type="search"
        enterKeyHint="search"
        autocomplete="off"
        spellcheck={false}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
      />
      {value && (
        <button
          type="button"
          class={styles.clear}
          aria-label="Clear search"
          onClick={() => {
            onInput("");
            input.current?.focus(); // the button disappears; keep focus in the field (critique M2)
          }}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

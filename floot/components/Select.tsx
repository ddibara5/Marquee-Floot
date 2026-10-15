"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import inputStyles from "./Input.module.css";
import styles from "./Select.module.css";

type SelectProps = {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
};

type SelectState = {
  value?: string;
  disabled?: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  choose: (value: string) => void;
  label?: React.ReactNode;
};

const SelectContext = React.createContext<SelectState | null>(null);

function findLabel(children: React.ReactNode, value?: string): React.ReactNode {
  if (!value) return undefined;
  let found: React.ReactNode;
  React.Children.forEach(children, child => {
    if (found !== undefined || !React.isValidElement<{ value?: string; children?: React.ReactNode }>(child)) return;
    if (child.type === SelectItem && child.props.value === value) found = child.props.children;
    else if (child.props.children) found = findLabel(child.props.children, value);
  });
  return found;
}

const Select = (props: SelectProps) => {
  const { children, value, defaultValue, onValueChange, open: controlledOpen,
    defaultOpen, onOpenChange, disabled, name } = props;
  const isValueControlled = Object.prototype.hasOwnProperty.call(props, "value");
  const [localValue, setLocalValue] = React.useState(defaultValue);
  const [localOpen, setLocalOpen] = React.useState(defaultOpen ?? false);
  const selected = isValueControlled ? value : localValue;
  const open = controlledOpen ?? localOpen;
  const setOpen = React.useCallback((next: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);
  const choose = React.useCallback((next: string) => {
    if (!isValueControlled) setLocalValue(next);
    if (next !== selected) onValueChange?.(next);
    setOpen(false);
  }, [isValueControlled, selected, onValueChange, setOpen]);

  return <SelectContext.Provider value={{
    value: selected, disabled, open, setOpen, choose,
    label: findLabel(children, selected),
  }}>
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      {children}
    </PopoverPrimitive.Root>
    {name && <input type="hidden" name={name} value={selected ?? ""} />}
  </SelectContext.Provider>;
};

const SelectValue = ({ children, placeholder }: {
  children?: React.ReactNode; placeholder?: React.ReactNode;
}) => {
  const state = React.useContext(SelectContext);
  return <span data-placeholder={!state?.value ? "" : undefined}>
    {children ?? state?.label ?? placeholder}
  </span>;
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ children, className, onKeyDown, ...props }, ref) => {
  const state = React.useContext(SelectContext);
  return <PopoverPrimitive.Trigger
    ref={ref}
    {...props}
    type="button"
    role="combobox"
    aria-haspopup="listbox"
    disabled={state?.disabled || props.disabled}
    className={`${inputStyles.input} ${styles.selectTrigger} ${className || ""}`}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (!event.defaultPrevented && !state?.open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        state?.setOpen(true);
      }
    }}
  >
    {children}
    <ChevronDown aria-hidden="true" className={styles.selectIcon} />
  </PopoverPrimitive.Trigger>;
});
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  HTMLDivElement, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { position?: string }
>(({ children, position: _position, className, onOpenAutoFocus, onKeyDown, ...props }, ref) =>
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      role="listbox"
      align="start"
      sideOffset={4}
      className={`${styles.selectContent} ${className || ""}`}
      onOpenAutoFocus={event => {
        onOpenAutoFocus?.(event);
        if (!event.defaultPrevented) {
          event.preventDefault();
          const items = (event.target as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)');
          (Array.from(items).find(item => item.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
        }
      }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.defaultPrevented || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        if (items.length) { event.preventDefault(); items[next].focus(); }
      }}
      {...props}
    >
      <div className={styles.selectViewport}>{children}</div>
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; textValue?: string }
>(({ children, className, value, textValue: _textValue, onClick, ...props }, ref) => {
  const state = React.useContext(SelectContext);
  const selected = state?.value === value;
  return <button
    ref={ref}
    type="button"
    role="option"
    aria-selected={selected}
    data-state={selected ? "checked" : "unchecked"}
    className={`${styles.selectItem} ${className || ""}`}
    onClick={event => {
      onClick?.(event);
      if (!event.defaultPrevented) state?.choose(value);
    }}
    {...props}
  >
    {children}
    {selected && <span aria-hidden="true" className={styles.selectItemIndicator}>
      <Check className={styles.checkIcon} />
    </span>}
  </button>;
});
SelectItem.displayName = "SelectItem";

const SelectGroup = ({ children }: { children?: React.ReactNode }) =>
  <div role="group">{children}</div>;
const SelectLabel = ({ children, className }: React.HTMLAttributes<HTMLSpanElement>) =>
  <span className={`${styles.selectLabel} ${className || ""}`}>{children}</span>;
const SelectSeparator = ({ className }: React.HTMLAttributes<HTMLDivElement>) =>
  <div role="separator" className={`${styles.selectSeparator} ${className || ""}`} />;
const SelectScrollUpButton = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const SelectScrollDownButton = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent,
  SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton,
};

import { Braces, ChevronDown } from "lucide-react";
import {
  KeyboardEvent,
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { EnvironmentVariable } from "../types";

interface EnvAutocompleteFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  disabled?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  autoComplete?: string;
  dataUndoScope?: string;
}

type TriggerContext = {
  start: number;
  end: number;
  query: string;
};

const getActiveVariables = (
  environments: { id: string; variables: EnvironmentVariable[] }[],
  activeEnvironmentId: string | null,
): EnvironmentVariable[] => {
  if (!activeEnvironmentId) {
    return [];
  }

  return (
    environments.find((environment) => environment.id === activeEnvironmentId)
      ?.variables ?? []
  );
};

const detectTrigger = (
  text: string,
  caret: number,
): TriggerContext | null => {
  const beforeCaret = text.slice(0, caret);
  const openIndex = beforeCaret.lastIndexOf("{{");

  if (openIndex < 0) {
    return null;
  }

  const closeIndex = beforeCaret.lastIndexOf("}}");
  if (closeIndex > openIndex) {
    return null;
  }

  const query = beforeCaret.slice(openIndex + 2);
  if (query.includes("{") || query.includes("}")) {
    return null;
  }

  return {
    start: openIndex,
    end: caret,
    query,
  };
};

export const EnvAutocompleteField = ({
  value,
  onValueChange,
  placeholder,
  className,
  multiline = false,
  rows = 3,
  type = "text",
  disabled,
  onKeyDown,
  onBlur,
  autoComplete,
  dataUndoScope,
}: EnvAutocompleteFieldProps): ReactElement => {
  const environments = useWorkspaceStore((state) => state.workspace.environments);
  const activeEnvironmentId = useWorkspaceStore(
    (state) => state.workspace.activeEnvironmentId,
  );
  const variables = useMemo(
    () => getActiveVariables(environments, activeEnvironmentId),
    [environments, activeEnvironmentId],
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [triggerContext, setTriggerContext] = useState<TriggerContext | null>(null);

  const suggestions = useMemo(() => {
    const source = [...variables]
      .filter((variable) => variable.key.trim().length > 0)
      .sort((a, b) => a.key.localeCompare(b.key));

    if (manualOpen) {
      return source;
    }

    if (!triggerContext) {
      return [];
    }

    const query = triggerContext.query.trim();
    if (!query) {
      return source;
    }

    const lower = query.toLowerCase();
    return source.filter((variable) => variable.key.toLowerCase().includes(lower));
  }, [variables, manualOpen, triggerContext]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveIndex((current) => {
      if (suggestions.length === 0) {
        return 0;
      }
      return Math.min(current, suggestions.length - 1);
    });
  }, [open, suggestions]);

  const applyValue = (
    variableKey: string,
    overrideContext?: TriggerContext | null,
  ): void => {
    const input = multiline ? textareaRef.current : inputRef.current;
    if (!input) {
      return;
    }

    const context = overrideContext ?? triggerContext;
    const selectionStart = input.selectionStart ?? value.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    const token = `{{${variableKey}}}`;
    let nextValue = value;
    let nextCaret = selectionEnd;

    if (context && !manualOpen) {
      nextValue = `${value.slice(0, context.start)}${token}${value.slice(context.end)}`;
      nextCaret = context.start + token.length;
    } else {
      nextValue = `${value.slice(0, selectionStart)}${token}${value.slice(selectionEnd)}`;
      nextCaret = selectionStart + token.length;
    }

    onValueChange(nextValue);
    setOpen(false);
    setManualOpen(false);
    setTriggerContext(null);

    requestAnimationFrame(() => {
      const current = multiline ? textareaRef.current : inputRef.current;
      if (!current) {
        return;
      }
      current.focus();
      current.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const refreshTrigger = (nextValue: string, caret: number): TriggerContext | null => {
    const context = detectTrigger(nextValue, caret);
    setTriggerContext(context);

    if (context) {
      setManualOpen(false);
      setOpen(true);
    } else if (!manualOpen) {
      setOpen(false);
    }

    return context;
  };

  const handleFieldChange = (nextValue: string, caret: number): void => {
    onValueChange(nextValue);
    refreshTrigger(nextValue, caret);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === " ") {
      if (suggestions.length > 0) {
        event.preventDefault();
        setManualOpen(true);
        setOpen(true);
      }
    }

    if (open && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % suggestions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === 0 ? suggestions.length - 1 : current - 1,
        );
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selected = suggestions[activeIndex];
        if (selected) {
          applyValue(selected.key);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setManualOpen(false);
      }
    }

    onKeyDown?.(event);
  };

  const sharedProps = {
    value,
    placeholder,
    disabled,
    autoComplete,
    onBlur: () => {
      window.setTimeout(() => {
        setOpen(false);
        setManualOpen(false);
      }, 120);
      onBlur?.();
    },
    onKeyDown: handleKeyDown,
    "data-undo-scope": dataUndoScope,
  };

  const hasVariables = variables.length > 0;

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={textareaRef}
          {...sharedProps}
          rows={rows}
          className={`${className ?? ""} pr-10`}
          onChange={(event) =>
            handleFieldChange(
              event.target.value,
              event.target.selectionStart ?? event.target.value.length,
            )
          }
          onClick={(event) =>
            refreshTrigger(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            )
          }
          onKeyUp={(event) =>
            refreshTrigger(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            )
          }
        />
      ) : (
        <input
          ref={inputRef}
          {...sharedProps}
          type={type}
          className={`${className ?? ""} pr-10`}
          onChange={(event) =>
            handleFieldChange(
              event.target.value,
              event.target.selectionStart ?? event.target.value.length,
            )
          }
          onClick={(event) =>
            refreshTrigger(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            )
          }
          onKeyUp={(event) =>
            refreshTrigger(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            )
          }
        />
      )}

      <button
        type="button"
        onClick={() => {
          if (!hasVariables) {
            return;
          }
          setManualOpen((current) => {
            const next = !current;
            setOpen(next);
            return next;
          });
        }}
        onMouseDown={(event) => event.preventDefault()}
        disabled={!hasVariables || disabled}
        className="absolute right-1.5 top-1/2 inline-flex h-6 -translate-y-1/2 items-center gap-0.5 rounded-md border border-input/70 bg-background/70 px-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        title={hasVariables ? "Insert variable" : "No variables in active environment"}
      >
        <Braces size={10} />
        <ChevronDown size={10} />
      </button>

      {open && suggestions.length > 0 && (
        <div className="panel-surface-strong absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-44 overflow-auto rounded-xl border border-border/70 p-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyValue(suggestion.key, triggerContext)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                index === activeIndex
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            >
              <span className="font-medium">{suggestion.key}</span>
              {suggestion.isSecret && (
                <span className="text-[10px] uppercase tracking-[0.12em]">secret</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

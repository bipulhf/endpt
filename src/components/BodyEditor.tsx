import { ReactElement } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { createId } from "../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  BodyType,
  FormDataRow,
  RawLanguage,
  RequestBody,
} from "../types";

interface BodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}

const BODY_TYPES: BodyType[] = [
  "none",
  "json",
  "raw",
  "form-data",
  "x-www-form-urlencoded",
  "binary",
  "graphql",
];

const RAW_LANGUAGES: RawLanguage[] = [
  "text",
  "json",
  "xml",
  "html",
  "javascript",
];

const createFormRow = (): FormDataRow => ({
  id: createId(),
  key: "",
  value: "",
  type: "text",
  enabled: true,
});

export const BodyEditor = ({
  body,
  onChange,
}: BodyEditorProps): ReactElement => {
  const updateBodyType = (type: BodyType): void => {
    onChange({
      ...body,
      type,
      rawLanguage: type === "json" ? "json" : body.rawLanguage,
    });
  };

  const updateFormRows = (
    mode: "formData" | "urlEncoded",
    updater: (rows: FormDataRow[]) => FormDataRow[],
  ): void => {
    onChange({
      ...body,
      [mode]: updater(body[mode]),
    });
  };

  const selectBinaryFile = async (): Promise<void> => {
    const selected = await open({ multiple: false });
    if (!selected || Array.isArray(selected)) {
      return;
    }
    onChange({ ...body, binaryFilePath: selected });
  };

  const formMode = body.type === "form-data" ? "formData" : "urlEncoded";

  return (
    <div className="panel-surface-strong min-h-0 min-w-0 flex-1 overflow-auto rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {BODY_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateBodyType(type)}
            className={`rounded-lg px-2.5 py-1.5 text-xs capitalize transition-all ${
              body.type === type
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted/70 text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {(body.type === "json" || body.type === "raw") && (
        <>
          {body.type === "raw" && (
            <Select
              value={body.rawLanguage}
              onValueChange={(value) =>
                onChange({ ...body, rawLanguage: value as RawLanguage })
              }
            >
              <SelectTrigger className="mb-2 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RAW_LANGUAGES.map((language) => (
                  <SelectItem
                    key={language}
                    value={language}
                    className="text-xs capitalize"
                  >
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <textarea
            value={body.raw}
            onChange={(event) =>
              onChange({ ...body, raw: event.target.value })
            }
            placeholder={
              body.type === "json"
                ? '{\n  "key": "value"\n}'
                : "Enter request body"
            }
            className="control-field min-h-[120px] w-full resize-y rounded-[1rem] p-2.5 font-mono text-sm text-foreground"
          />
        </>
      )}

      {body.type === "none" && (
        <p className="py-6 text-sm text-muted-foreground">
          This request does not have a body.
        </p>
      )}

      {(body.type === "form-data" ||
        body.type === "x-www-form-urlencoded") && (
        <div className="space-y-2">
          <div className="space-y-2 sm:hidden">
            {(body.type === "form-data"
              ? body.formData
              : body.urlEncoded
            ).map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-border/70 bg-background/35 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) =>
                        updateFormRows(formMode, (rows) =>
                          rows.map((current) =>
                            current.id === row.id
                              ? { ...current, enabled: event.target.checked }
                              : current,
                          ),
                        )
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormRows(formMode, (rows) =>
                        rows.filter((current) => current.id !== row.id),
                      )
                    }
                    className="rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    value={row.key}
                    onChange={(event) =>
                      updateFormRows(formMode, (rows) =>
                        rows.map((current) =>
                          current.id === row.id
                            ? { ...current, key: event.target.value }
                            : current,
                        ),
                      )
                    }
                    placeholder="Key"
                    className="control-field rounded-xl px-3 py-2 text-sm text-foreground"
                  />
                  <input
                    value={row.value}
                    onChange={(event) =>
                      updateFormRows(formMode, (rows) =>
                        rows.map((current) =>
                          current.id === row.id
                            ? { ...current, value: event.target.value }
                            : current,
                        ),
                      )
                    }
                    placeholder="Value"
                    className="control-field rounded-xl px-3 py-2 text-sm text-foreground"
                  />
                  {body.type === "form-data" ? (
                    <Select
                      value={row.type}
                      onValueChange={(value) =>
                        updateFormRows("formData", (rows) =>
                          rows.map((current) =>
                            current.id === row.id
                              ? { ...current, type: value as "text" | "file" }
                              : current,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text" className="text-xs">
                          text
                        </SelectItem>
                        <SelectItem value="file" className="text-xs">
                          file
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <div className="min-w-[36rem]">
              <div
                className={`grid gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground ${body.type === "form-data" ? "grid-cols-[40px_minmax(9rem,1fr)_minmax(9rem,1fr)_120px_40px]" : "grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px]"}`}
              >
                <span>On</span>
                <span>Key</span>
                <span>Value</span>
                {body.type === "form-data" ? <span>Type</span> : null}
                <span />
              </div>

              {(body.type === "form-data"
                ? body.formData
                : body.urlEncoded
              ).map((row) => (
                <div
                  key={row.id}
                  className={`mt-2 grid gap-2 ${body.type === "form-data" ? "grid-cols-[40px_minmax(9rem,1fr)_minmax(9rem,1fr)_120px_40px]" : "grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px]"}`}
                >
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) =>
                      updateFormRows(formMode, (rows) =>
                        rows.map((current) =>
                          current.id === row.id
                            ? { ...current, enabled: event.target.checked }
                            : current,
                        ),
                      )
                    }
                    className="mt-3 h-4 w-4 rounded border-input accent-primary"
                  />
                  <input
                    value={row.key}
                    onChange={(event) =>
                      updateFormRows(formMode, (rows) =>
                        rows.map((current) =>
                          current.id === row.id
                            ? { ...current, key: event.target.value }
                            : current,
                        ),
                      )
                    }
                    className="control-field rounded-xl px-3 py-2.5 text-sm text-foreground"
                  />
                  <input
                    value={row.value}
                    onChange={(event) =>
                      updateFormRows(formMode, (rows) =>
                        rows.map((current) =>
                          current.id === row.id
                            ? { ...current, value: event.target.value }
                            : current,
                        ),
                      )
                    }
                    className="control-field rounded-xl px-3 py-2.5 text-sm text-foreground"
                  />
                  {body.type === "form-data" ? (
                    <Select
                      value={row.type}
                      onValueChange={(value) =>
                        updateFormRows("formData", (rows) =>
                          rows.map((current) =>
                            current.id === row.id
                              ? { ...current, type: value as "text" | "file" }
                              : current,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text" className="text-xs">
                          text
                        </SelectItem>
                        <SelectItem value="file" className="text-xs">
                          file
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      updateFormRows(formMode, (rows) =>
                        rows.filter((current) => current.id !== row.id),
                      )
                    }
                    className="rounded-xl border border-input/80 bg-background/70 px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateFormRows(formMode, (rows) => [...rows, createFormRow()])
            }
            className="rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/30"
          >
            + Add Row
          </button>
        </div>
      )}

      {body.type === "binary" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              void selectBinaryFile();
            }}
            className="rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/30"
          >
            Select File
          </button>
          <p className="text-xs text-muted-foreground">
            {body.binaryFilePath ?? "No file selected"}
          </p>
        </div>
      )}

      {body.type === "graphql" && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Query
          </label>
          <textarea
            value={body.graphql.query}
            onChange={(event) =>
              onChange({
                ...body,
                graphql: { ...body.graphql, query: event.target.value },
              })
            }
            className="control-field min-h-[100px] w-full resize-y rounded-[1rem] p-2.5 font-mono text-sm text-foreground"
          />
          <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Variables (JSON)
          </label>
          <textarea
            value={body.graphql.variables}
            onChange={(event) =>
              onChange({
                ...body,
                graphql: { ...body.graphql, variables: event.target.value },
              })
            }
            className="control-field min-h-[80px] w-full resize-y rounded-[1rem] p-2.5 font-mono text-sm text-foreground"
          />
        </div>
      )}
    </div>
  );
};

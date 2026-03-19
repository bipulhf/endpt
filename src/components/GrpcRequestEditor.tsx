import { FileCode2, Play, RefreshCcw, Upload } from "lucide-react";
import { ReactElement } from "react";
import { ApiRequest, GrpcMethodDescriptor } from "../types";
import { EnvAutocompleteField } from "./EnvAutocompleteField";
import { KeyValueRowsEditor } from "./KeyValueRowsEditor";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface GrpcRequestEditorProps {
  request: ApiRequest;
  methods: GrpcMethodDescriptor[];
  loadingMethods: boolean;
  onUpdateGrpc: (partial: Partial<ApiRequest["grpc"]>) => void;
  onImportProto: () => Promise<void>;
  onRefreshMethods: () => Promise<void>;
  onCall: () => Promise<void>;
  isSending: boolean;
}

export const GrpcRequestEditor = ({
  request,
  methods,
  loadingMethods,
  onUpdateGrpc,
  onImportProto,
  onRefreshMethods,
  onCall,
  isSending,
}: GrpcRequestEditorProps): ReactElement => {
  return (
    <div className="space-y-2">
      <div className="panel-surface rounded-[1rem] p-2.5 sm:rounded-[1.25rem] sm:p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              gRPC Unary
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Import proto files, choose method, then call with JSON payload.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              void onCall();
            }}
            disabled={isSending}
            className="h-9"
          >
            <Play size={14} />
            {isSending ? "Calling" : "Call"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <EnvAutocompleteField
            value={request.grpc.endpoint}
            onValueChange={(value) => onUpdateGrpc({ endpoint: value })}
            placeholder="localhost:50051"
            className="control-field h-10 rounded-xl px-3 py-2 text-sm text-foreground"
            dataUndoScope="workspace"
          />

          <button
            type="button"
            onClick={() => onUpdateGrpc({ useTls: !request.grpc.useTls })}
            className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
              request.grpc.useTls
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-border/70 bg-background/45 text-muted-foreground hover:bg-accent/30"
            }`}
          >
            {request.grpc.useTls ? "TLS Enabled" : "Insecure"}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Select
            value={request.grpc.methodPath || "__none__"}
            onValueChange={(value) =>
              onUpdateGrpc({ methodPath: value === "__none__" ? "" : value })
            }
          >
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Select gRPC method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select method</SelectItem>
              {methods.map((method) => (
                <SelectItem key={method.method_path} value={method.method_path}>
                  {method.method_path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void onImportProto();
            }}
            className="h-10"
          >
            <Upload size={14} />
            Import Proto
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void onRefreshMethods();
            }}
            className="h-10"
            disabled={loadingMethods || request.grpc.protoFiles.length === 0}
          >
            <RefreshCcw size={14} className={loadingMethods ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="mt-2 rounded-xl border border-border/70 bg-background/35 px-2.5 py-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileCode2 size={13} />
            <span>Proto files ({request.grpc.protoFiles.length})</span>
          </div>
          {request.grpc.protoFiles.length > 0 ? (
            <ul className="max-h-24 space-y-1 overflow-auto text-[11px] text-muted-foreground">
              {request.grpc.protoFiles.map((file) => (
                <li key={file} className="truncate">
                  {file}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">No proto files selected.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        <div className="panel-surface-strong rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Metadata
          </p>
          <KeyValueRowsEditor
            rows={request.grpc.metadata}
            onChange={(rows) => onUpdateGrpc({ metadata: rows })}
            keyPlaceholder="x-tenant-id"
            valuePlaceholder="tenant-a"
            addLabel="Add Metadata"
          />
        </div>

        <div className="panel-surface-strong rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            JSON Payload
          </p>
          <EnvAutocompleteField
            value={request.grpc.payloadJson}
            onValueChange={(value) => onUpdateGrpc({ payloadJson: value })}
            multiline
            rows={18}
            placeholder='{"id":"123"}'
            className="control-field min-h-[18rem] w-full resize-y rounded-[1rem] p-2.5 font-mono text-sm text-foreground"
            dataUndoScope="workspace"
          />
        </div>
      </div>
    </div>
  );
};

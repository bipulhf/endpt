import { Key, Lock, Shield, ShieldOff } from "lucide-react";
import { ReactElement } from "react";
import { AuthConfig, AuthType } from "../types";

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const authTypes: { value: AuthType; label: string; icon: ReactElement }[] = [
  { value: "none", label: "No Auth", icon: <ShieldOff size={14} /> },
  { value: "bearer", label: "Bearer Token", icon: <Shield size={14} /> },
  { value: "basic", label: "Basic Auth", icon: <Lock size={14} /> },
  { value: "api-key", label: "API Key", icon: <Key size={14} /> },
];

export const AuthEditor = ({
  auth,
  onChange,
}: AuthEditorProps): ReactElement => {
  const updateType = (type: AuthType): void => {
    onChange({ ...auth, type });
  };

  return (
    <div className="panel-surface-strong min-h-0 flex-1 overflow-auto rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {authTypes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => updateType(item.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              auth.type === item.value
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted/70 text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {auth.type === "none" && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          This request does not use any authorization.
        </p>
      )}

      {auth.type === "bearer" && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Token
            </span>
            <input
              type="text"
              value={auth.bearer.token}
              onChange={(e) =>
                onChange({ ...auth, bearer: { token: e.target.value } })
              }
              placeholder="Enter bearer token"
              className="control-field h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            The token will be sent as:{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              Authorization: Bearer &lt;token&gt;
            </code>
          </p>
        </div>
      )}

      {auth.type === "basic" && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Username
            </span>
            <input
              type="text"
              value={auth.basic.username}
              onChange={(e) =>
                onChange({
                  ...auth,
                  basic: { ...auth.basic, username: e.target.value },
                })
              }
              placeholder="Username"
              className="control-field h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              value={auth.basic.password}
              onChange={(e) =>
                onChange({
                  ...auth,
                  basic: { ...auth.basic, password: e.target.value },
                })
              }
              placeholder="Password"
              className="control-field h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Sent as:{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              Authorization: Basic base64(username:password)
            </code>
          </p>
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Key
            </span>
            <input
              type="text"
              value={auth.apiKey.key}
              onChange={(e) =>
                onChange({
                  ...auth,
                  apiKey: { ...auth.apiKey, key: e.target.value },
                })
              }
              placeholder="X-API-Key"
              className="control-field h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Value
            </span>
            <input
              type="text"
              value={auth.apiKey.value}
              onChange={(e) =>
                onChange({
                  ...auth,
                  apiKey: { ...auth.apiKey, value: e.target.value },
                })
              }
              placeholder="your-api-key"
              className="control-field h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Add to
            </span>
            <div className="flex gap-1.5">
              {(["header", "query"] as const).map((addTo) => (
                <button
                  key={addTo}
                  type="button"
                  onClick={() =>
                    onChange({ ...auth, apiKey: { ...auth.apiKey, addTo } })
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition-all ${
                    auth.apiKey.addTo === addTo
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted/70 text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {addTo === "header" ? "Header" : "Query Param"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

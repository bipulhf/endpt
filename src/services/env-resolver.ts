import { ApiRequest, EnvironmentVariable } from "../types";
import { ENV_KEY_PATTERN } from "../store/defaults";

const TOKEN_PATTERN = /\{\{([^{}]+)\}\}/g;
export const MAX_VARIABLE_RESOLVE_DEPTH = 8;

export interface VariableResolutionDiagnostics {
  unresolved: string[];
  cycles: string[];
  depthExceeded: string[];
}

export interface ResolvedRequestResult {
  request: ApiRequest;
  diagnostics: VariableResolutionDiagnostics;
}

type MutableDiagnostics = {
  unresolved: Set<string>;
  cycles: Set<string>;
  depthExceeded: Set<string>;
};

const toDiagnostics = (
  diagnostics: MutableDiagnostics,
): VariableResolutionDiagnostics => ({
  unresolved: [...diagnostics.unresolved].sort(),
  cycles: [...diagnostics.cycles].sort(),
  depthExceeded: [...diagnostics.depthExceeded].sort(),
});

const createResolver = (
  variables: EnvironmentVariable[],
): {
  resolveText: (value: string) => string;
  diagnostics: MutableDiagnostics;
} => {
  const variableMap = new Map(
    variables
      .map((variable) => [variable.key.trim(), variable.value] as const)
      .filter(([key]) => key.length > 0),
  );
  const cache = new Map<string, string>();
  const diagnostics: MutableDiagnostics = {
    unresolved: new Set<string>(),
    cycles: new Set<string>(),
    depthExceeded: new Set<string>(),
  };

  const resolveVariable = (key: string, stack: string[]): string => {
    if (cache.has(key)) {
      return cache.get(key) ?? "";
    }

    if (stack.includes(key)) {
      const start = stack.indexOf(key);
      const cycle = [...stack.slice(start), key].join(" -> ");
      diagnostics.cycles.add(cycle);
      return `{{${key}}}`;
    }

    if (stack.length >= MAX_VARIABLE_RESOLVE_DEPTH) {
      diagnostics.depthExceeded.add([...stack, key].join(" -> "));
      return `{{${key}}}`;
    }

    const raw = variableMap.get(key);
    if (typeof raw !== "string") {
      diagnostics.unresolved.add(key);
      return `{{${key}}}`;
    }

    const resolved = resolveText(raw, [...stack, key]);
    cache.set(key, resolved);
    return resolved;
  };

  const resolveText = (value: string, stack: string[] = []): string => {
    if (!value.includes("{{")) {
      return value;
    }

    return value.replace(TOKEN_PATTERN, (match, rawName: string) => {
      const key = rawName.trim();
      if (!ENV_KEY_PATTERN.test(key)) {
        diagnostics.unresolved.add(key || match);
        return match;
      }
      return resolveVariable(key, stack);
    });
  };

  return {
    resolveText: (value: string) => resolveText(value, []),
    diagnostics,
  };
};

export const resolveRequestTemplate = (
  request: ApiRequest,
  variables: EnvironmentVariable[],
): ResolvedRequestResult => {
  const resolver = createResolver(variables);
  const resolveText = resolver.resolveText;

  const resolvedRequest: ApiRequest = {
    ...request,
    url: resolveText(request.url),
    headers: request.headers.map((header) => ({
      ...header,
      key: resolveText(header.key),
      value: resolveText(header.value),
    })),
    queryParams: request.queryParams.map((param) => ({
      ...param,
      key: resolveText(param.key),
      value: resolveText(param.value),
    })),
    auth: {
      ...request.auth,
      bearer: {
        token: resolveText(request.auth.bearer.token),
      },
      basic: {
        username: resolveText(request.auth.basic.username),
        password: resolveText(request.auth.basic.password),
      },
      apiKey: {
        ...request.auth.apiKey,
        key: resolveText(request.auth.apiKey.key),
        value: resolveText(request.auth.apiKey.value),
      },
    },
    body: {
      ...request.body,
      raw: resolveText(request.body.raw),
      binaryFilePath: request.body.binaryFilePath
        ? resolveText(request.body.binaryFilePath)
        : null,
      graphql: {
        query: resolveText(request.body.graphql.query),
        variables: resolveText(request.body.graphql.variables),
      },
      formData: request.body.formData.map((row) => ({
        ...row,
        key: resolveText(row.key),
        value: resolveText(row.value),
      })),
      urlEncoded: request.body.urlEncoded.map((row) => ({
        ...row,
        key: resolveText(row.key),
        value: resolveText(row.value),
      })),
    },
  };

  return {
    request: resolvedRequest,
    diagnostics: toDiagnostics(resolver.diagnostics),
  };
};

export const hasResolverIssues = (
  diagnostics: VariableResolutionDiagnostics,
): boolean =>
  diagnostics.unresolved.length > 0 ||
  diagnostics.cycles.length > 0 ||
  diagnostics.depthExceeded.length > 0;

export const formatResolverIssues = (
  diagnostics: VariableResolutionDiagnostics,
): string[] => {
  const lines: string[] = [];

  if (diagnostics.unresolved.length > 0) {
    lines.push(`Unresolved variables: ${diagnostics.unresolved.join(", ")}`);
  }

  if (diagnostics.cycles.length > 0) {
    lines.push(`Circular references: ${diagnostics.cycles.join("; ")}`);
  }

  if (diagnostics.depthExceeded.length > 0) {
    lines.push(
      `Max depth (${MAX_VARIABLE_RESOLVE_DEPTH}) exceeded: ${diagnostics.depthExceeded.join(
        "; ",
      )}`,
    );
  }

  return lines;
};

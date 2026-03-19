import { describe, expect, it } from "vitest";
import { createDefaultRequest } from "../../store/defaults";
import {
  MAX_VARIABLE_RESOLVE_DEPTH,
  hasResolverIssues,
  resolveRequestTemplate,
} from "../env-resolver";
import { EnvironmentVariable } from "../../types";

const buildVariables = (
  pairs: Array<{ key: string; value: string }>,
): EnvironmentVariable[] =>
  pairs.map((pair, index) => ({
    id: `v_${index}`,
    key: pair.key,
    value: pair.value,
    isSecret: false,
  }));

describe("resolveRequestTemplate", () => {
  it("replaces variables in URL, headers and body", () => {
    const request = createDefaultRequest("Get Users");
    request.url = "{{BASE_URL}}/users/{{USER_ID}}";
    request.headers = [
      {
        id: "h1",
        key: "Authorization",
        value: "Bearer {{TOKEN}}",
        enabled: true,
      },
    ];
    request.body.type = "json";
    request.body.raw = '{"id":"{{USER_ID}}"}';

    const result = resolveRequestTemplate(
      request,
      buildVariables([
        { key: "BASE_URL", value: "https://api.example.com" },
        { key: "USER_ID", value: "42" },
        { key: "TOKEN", value: "abc" },
      ]),
    );

    expect(result.request.url).toBe("https://api.example.com/users/42");
    expect(result.request.headers[0].value).toBe("Bearer abc");
    expect(result.request.body.raw).toBe('{"id":"42"}');
    expect(hasResolverIssues(result.diagnostics)).toBe(false);
  });

  it("resolves nested variables", () => {
    const request = createDefaultRequest("Nested");
    request.url = "{{API_URL}}";

    const result = resolveRequestTemplate(
      request,
      buildVariables([
        { key: "HOST", value: "example.com" },
        { key: "API_URL", value: "https://{{HOST}}/v1" },
      ]),
    );

    expect(result.request.url).toBe("https://example.com/v1");
    expect(result.diagnostics.cycles).toEqual([]);
    expect(result.diagnostics.unresolved).toEqual([]);
  });

  it("reports unresolved variables", () => {
    const request = createDefaultRequest("Unresolved");
    request.url = "https://{{MISSING_HOST}}/users";

    const result = resolveRequestTemplate(request, []);

    expect(result.diagnostics.unresolved).toContain("MISSING_HOST");
    expect(hasResolverIssues(result.diagnostics)).toBe(true);
  });

  it("reports cycles", () => {
    const request = createDefaultRequest("Cycle");
    request.url = "{{A}}";

    const result = resolveRequestTemplate(
      request,
      buildVariables([
        { key: "A", value: "{{B}}" },
        { key: "B", value: "{{A}}" },
      ]),
    );

    expect(result.diagnostics.cycles[0]).toContain("A");
    expect(result.diagnostics.cycles[0]).toContain("B");
  });

  it("reports depth overflow", () => {
    const request = createDefaultRequest("Depth");
    request.url = "{{A0}}";

    const depthVariables = Array.from(
      { length: MAX_VARIABLE_RESOLVE_DEPTH + 2 },
      (_, index) => ({
        key: `A${index}`,
        value: index === MAX_VARIABLE_RESOLVE_DEPTH + 1 ? "done" : `{{A${index + 1}}}`,
      }),
    );

    const result = resolveRequestTemplate(request, buildVariables(depthVariables));

    expect(result.diagnostics.depthExceeded.length).toBeGreaterThan(0);
    expect(hasResolverIssues(result.diagnostics)).toBe(true);
  });
});

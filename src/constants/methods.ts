import { HttpMethod } from "../types";

export const METHOD_BADGE_CLASSES: Record<HttpMethod, string> = {
  GET: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
  POST: "border-sky-600/20 bg-sky-600/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400",
  PUT: "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
  PATCH:
    "border-fuchsia-600/20 bg-fuchsia-600/10 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-400",
  DELETE:
    "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400",
  HEAD: "border-slate-600/20 bg-slate-600/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-400",
  OPTIONS:
    "border-slate-600/20 bg-slate-600/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-400",
};

export const METHOD_TEXT_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-700 dark:text-emerald-400",
  POST: "text-sky-700 dark:text-sky-400",
  PUT: "text-amber-700 dark:text-amber-400",
  PATCH: "text-fuchsia-700 dark:text-fuchsia-400",
  DELETE: "text-rose-700 dark:text-rose-400",
  HEAD: "text-muted-foreground",
  OPTIONS: "text-muted-foreground",
};

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

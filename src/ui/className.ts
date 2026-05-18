export type ClassNamePart = string | false | null | undefined;

export const joinClassName = (...parts: ClassNamePart[]) =>
  parts.filter(Boolean).join(" ");

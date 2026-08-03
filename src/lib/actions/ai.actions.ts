"use server";

import { redirect } from "next/navigation";
import { parseNaturalSearch } from "@/lib/ai/nl-search";
import {
  generateEventDescription,
  type DescribeEventResult,
} from "@/lib/ai/describe-event";

/** Drafts an event description from the create/edit form's title + notes. */
export async function draftEventDescription(input: {
  title: string;
  notes?: string;
}): Promise<DescribeEventResult> {
  if (typeof input?.title !== "string" || !input.title.trim()) {
    return { ok: false, error: "Add a title first, then draft a description." };
  }
  return generateEventDescription({
    title: input.title.slice(0, 200),
    notes: typeof input.notes === "string" ? input.notes.slice(0, 2000) : undefined,
  });
}

/**
 * Natural-language search: extracts filters from the query and redirects to
 * /events with regular search params — the result is the same shareable URL
 * a manual search would produce.
 */
export async function nlSearch(formData: FormData): Promise<void> {
  const query = formData.get("ask");
  const params =
    typeof query === "string" && query.trim()
      ? await parseNaturalSearch(query.slice(0, 300))
      : new URLSearchParams();
  const suffix = params.toString();
  redirect(suffix ? `/events?${suffix}` : "/events");
}

import { nlSearch } from "@/lib/actions/ai.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Natural-language search box, powered by Claude (AI-2). Renders only when
 * the page confirms ANTHROPIC_API_KEY is configured. Submits to a server
 * action that redirects to /events with regular search params, so results
 * are the same shareable URLs the filter form produces.
 */
export function NlSearchForm() {
  return (
    <form
      action={nlSearch}
      role="search"
      aria-label="Search events in plain English"
      className="mb-4 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <label htmlFor="nl-search" className="block text-sm font-medium text-neutral-700">
        Ask for events in plain English{" "}
        <span className="font-normal text-neutral-500">(AI-powered)</span>
      </label>
      <div className="mt-1 flex gap-3">
        <Input
          id="nl-search"
          type="search"
          name="ask"
          maxLength={300}
          placeholder='e.g. "free tech events near Denver" or "outdoor stuff in Austin"'
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Ask
        </Button>
      </div>
    </form>
  );
}

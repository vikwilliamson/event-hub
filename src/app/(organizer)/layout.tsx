import { OrganizerTopbar } from "@/components/layout/organizer-topbar";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganizerTopbar />
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </>
  );
}

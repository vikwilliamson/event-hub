import { PublicHeader } from "@/components/layout/public-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4 py-8"
      >
        {children}
      </main>
    </>
  );
}

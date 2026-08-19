import Image from "next/image";
import Link from "next/link";

/**
 * Brand header for the login and signup screens.
 *
 * Matches the mobile app's auth treatment: the real mascot logo in a rounded
 * white tile with a soft brand glow, rather than the generic book icon the web
 * used to show. Both platforms now render the same asset
 * (apps/mobile/assets/logo.png, copied to apps/web/public/logo.png).
 */
export function AuthBrandHeader({
  title,
  subtitle,
  /* The OTP step is mid-flow, so its logo does not link back to the marketing
     site — leaving would lose the code the learner just received. */
  linkHome = true,
}: {
  title: string;
  subtitle: React.ReactNode;
  linkHome?: boolean;
}) {
  const logo = (
    <span className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] ring-1 ring-black/5">
      <Image
        src="/logo.png"
        alt="JapanGoLearn"
        width={160}
        height={160}
        priority
        className="h-full w-full object-contain"
      />
    </span>
  );

  return (
    <div className="mb-8 text-center">
      {linkHome ? (
        <Link
          href="/"
          aria-label="JapanGoLearn home"
          className="inline-block rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          {logo}
        </Link>
      ) : (
        logo
      )}

      <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

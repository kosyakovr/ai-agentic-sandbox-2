export function PostsError({ href }: { href: string }) {
  return (
    <div role="alert">
      <p>Posts couldn&apos;t be loaded.</p>
      <p>
        <a href={href}>Try again</a>
      </p>
    </div>
  );
}

export function BlockCustomPreview({ src, description, alt }: { src: string; description: string; alt: string }) {
  return (
    <>
      <figure className="relative aspect-[2.5] w-full overflow-hidden rounded-md border border-gray-200">
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
      </figure>
      <p className="mt-2 px-0.5 text-gray-500">{description}</p>
    </>
  );
}

import { Button } from '@/components/primitives/button';

export const HomeRoute = () => {
  return (
    <div className="flex min-h-[2000px] w-full flex-col gap-8">
      <h1>Home page</h1>
      <div className="flex w-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <Button>Primary button</Button>
        <Button variant="novu">Novu button</Button>
        <Button variant="destructive">Destructive button</Button>
        <Button variant="ghost">Ghost button</Button>
        <Button variant="outline">Outline button</Button>
      </div>
    </div>
  );
};

import { RiSearchLine } from 'react-icons/ri';

export const SubscriberListNoResults = () => {
  return (
    <div className="mt-[100px] flex flex-col items-center gap-4 py-10">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="bg-primary-50 rounded-full p-3">
          <RiSearchLine className="text-primary h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="text-foreground-950 text-lg font-medium">No subscribers found</h3>
        <p className="text-foreground-500">
          We couldn't find any subscribers that match your search criteria. Try adjusting your filters or import
          subscribers via API.
        </p>
      </div>
    </div>
  );
};

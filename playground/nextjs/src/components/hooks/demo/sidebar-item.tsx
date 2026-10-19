'use-client';

export type SidebarItemProps = {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  external?: boolean;
  children?: React.ReactNode;
};

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  isActive = false,
  external = false,
  children,
}) => {
  return (
    <div
      className={
        `flex cursor-pointer items-center space-x-4 rounded-md p-2 font-medium hover:bg-gray-100 ` +
        `${isActive ? 'bg-gray-100' : ''}`
      }
      style={{ height: '30px', padding: '4px 0', color: '#37352fa6' }}
    >
      <div className="h-4 w-4">
        <div className="mr-2 h-4 w-4 overflow-hidden">
          <Icon className="h-full w-full object-cover" />
        </div>
      </div>
      <span className={`text-sm ${isActive ? 'text-gray-900' : 'text-gray-800'}`}>{label}</span>
      {children}
    </div>
  );
};

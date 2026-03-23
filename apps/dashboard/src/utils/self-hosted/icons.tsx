export function NovuLogoBlackBg() {
  return (
    <img src="https://cdn.asupernova.com.br/auvp-navbar/AUVP_HORIZONTAL.svg" alt="Novu Logo" width={150} height={100} />
  );
}

export function UserAvatar(props: any) {
  return (
    <img
      src="/images/avatar-placeholder.png"
      alt="User Avatar"
      width={100}
      height={100}
      className="rounded-full"
      {...props}
    />
  );
}

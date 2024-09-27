import { CLERK_PUBLISHABLE_KEY, IS_EE_AUTH_ENABLED } from "@/config";
import { ClerkProvider as _ClerkProvider } from "@clerk/clerk-react";
import { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";

const CLERK_LOCALIZATION = {
  userProfile: {
    navbar: {
      title: "Settings",
      description: "",
      account: "User profile",
      security: "Access security",
    },
  },
  organizationProfile: {
    membersPage: {
      requestsTab: { autoSuggestions: { headerTitle: "" } },
      invitationsTab: { autoInvitations: { headerTitle: "" } },
    },
  },
  userButton: {
    action__signOut: "Log out",
    action__signOutAll: "Log out from all accounts",
    action__manageAccount: "Settings",
  },
};

const ALLOWED_REDIRECT_ORIGINS = ["http://localhost:*", window.location.origin];

type ClerkProviderProps = PropsWithChildren;
export const ClerkProvider = (props: ClerkProviderProps) => {
  const { children } = props;

  const navigate = useNavigate();

  if (!IS_EE_AUTH_ENABLED) {
    return <>{children}</>;
  }

  return (
    <_ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        createOrganization: {
          elements: {
            modalContent: {
              width: "auto",
            },
            rootBox: {
              width: "420px",
            },
          },
        },
      }}
      localization={CLERK_LOCALIZATION}
      allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS}
    >
      {children}
    </_ClerkProvider>
  );
};

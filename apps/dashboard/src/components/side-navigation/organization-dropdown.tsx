import { OrganizationDropdown as ClerkOrganizationDropdown } from '@/components/side-navigation/organization-dropdown-clerk';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { OrganizationDropdown as SelfHostedOrganizationDropdown } from '@/utils/self-hosted/organization-switcher';

// Community self-hosted uses a simple non-interactive component
// Cloud and Enterprise self-hosted use the full Clerk dropdown
const isCommunitySelHosted = IS_SELF_HOSTED && !IS_ENTERPRISE;

export const OrganizationDropdown = isCommunitySelHosted ? SelfHostedOrganizationDropdown : ClerkOrganizationDropdown;

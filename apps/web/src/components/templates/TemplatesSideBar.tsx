import { Navbar, useMantineTheme } from '@mantine/core';
import { colors, TemplateButton, Text } from '../../design-system';
import { BellGradient, MailGradient, MobileGradient, PlusGradient, TapeGradient } from '../../design-system/icons';

const templateButtons = [
  {
    label: 'In-App Content',
    description: 'This subtitle will describe things',
    icon: <MobileGradient />,
    action: true,
  },
  { label: 'Email Template', description: 'This subtitle will describe things', icon: <MailGradient />, action: true },
  { label: 'Add Channel', description: 'This subtitle will describe things', icon: <PlusGradient /> },
];

export function TemplatesSideBar() {
  const links = templateButtons.map((link) => <TemplateButton {...link} key={link.label} />);
  const theme = useMantineTheme();

  return (
    <Navbar mb={20} padding={30} width={{ base: 450 }} sx={{ paddingTop: '0px' }}>
      <Navbar.Section mr={20}>
        <TemplateButton
          icon={<BellGradient />}
          active
          description="This subtitle will describe things"
          label="Notification Settings"
        />
      </Navbar.Section>
      <Navbar.Section mr={20}>
        <Text mt={10} color={theme.colorScheme === 'dark' ? colors.B40 : colors.B70}>
          Channels
        </Text>
        <div>{links}</div>
      </Navbar.Section>
      <Navbar.Section mr={20}>
        <Text mt={10} color={theme.colorScheme === 'dark' ? colors.B40 : colors.B70}>
          Implementation Code
        </Text>
        <TemplateButton
          icon={<TapeGradient />}
          description="This subtitle will describe things"
          label="Trigger Snippet"
        />
      </Navbar.Section>
    </Navbar>
  );
}

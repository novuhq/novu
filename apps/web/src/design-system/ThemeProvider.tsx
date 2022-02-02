import { MantineProvider, Global } from '@mantine/core';

export function ThemeProvider({ children, darkMode = false }: { children: JSX.Element; darkMode?: boolean }) {
  console.log(darkMode);
  return (
    <MantineProvider
      withGlobalStyles
      theme={{
        // Override any other properties from default theme
        colorScheme: darkMode ? 'dark' : 'light',
        spacing: { xs: 15, sm: 20, md: 25, lg: 30, xl: 40 },
        fontFamily: 'Lato, sans serif',
        fontSizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 18 },
        primaryColor: 'gradient',
        // default mantine :
        // dark color scheme ->  background: theme.colors.dark[7], color: theme.colors.dark[0]
        // light color scheme -> background: theme.white         , color: theme.black
        colors: {
          gray: [
            '#EDF0F2', // LightBG
            '#f1f3f5',
            '#F5F8FA', // B98 // button disabled background light
            '#dee2e6',
            '#ced4da',
            '#BEBECC', // B80 // button disabled color light
            '#A1A1B2', // B70
            '#828299', // B60
            '#525266', // B40
            '#3D3D4D', // B30
          ],
          dark: [
            '#FFFFFF', // white // dark text color
            '#EDF0F2', // Light BG
            '#BEBECC', // B80
            '#525266', // B40
            '#292933', // B60 //background disabled dark
            '#3D3D4D', // B30
            '#525266', // color disabled dark //B40
            '#1E1E26', // B15
            '#13131A', // Dark BG
            '#23232B', // B17
          ],
          gradient: [
            'linear-gradient(0deg,#fff 0%, #fff 100%)', // white
            'linear-gradient(0deg,#525266 0%, #525266 100%)', // disabled dark dark[6]
            '#BEBECC',
            '#A1A1B2',
            '#828299',
            '#E54545', // error color
            'linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)', //  default primary - light- gradient horizontal
            'linear-gradient(0deg,#FF512F 0%,#DD2476 100%)', // gradient vertical
            'linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)', // default primary - dark- gradient horizontal
            '#BEBECC',
          ],
        },
        shadows: {
          sm: '15px 0px 5px rgba(38, 68, 128, 0.1)',
          md: '15px 0px 5px rgba(122, 133, 153, 0.2)',
          lg: '20px 0px 5px rgba(0, 0, 0, 0.2) ',
          xl: '20px 0px 5px rgba(233, 52, 94, 0.5)',
        },
        headings: {
          fontFamily: 'Lato, sans-serif',
          sizes: {
            h1: { fontSize: 26 },
            h2: { fontSize: 20 },
          },
        },
      }}>
      <Global
        styles={(theme) => ({
          body: {
            ...theme.fn.fontStyles(),
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
          },
        })}
      />
      {children}
    </MantineProvider>
  );
}

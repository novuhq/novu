import React from 'react';
import { Prism } from '@mantine/prism';
import { IEnvironment } from '@novu/shared';
import { colors, Text } from '../../../design-system';
import Card from '../../../components/layout/components/Card';
import { WIDGET_EMEBED_PATH } from '../../../config';

export const InAppCenterCard = ({ environment }: { environment: IEnvironment | undefined }) => {
  const embedCode = `<script>
  (function(n,o,t,i,f) {
    n[i] = {}, m = ['init']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, '${WIDGET_EMEBED_PATH}', 'novu', 'script');

  novu.init('${environment?.identifier}', '#notification-bell', {
    $user_id: "<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>",
    $email: "<REPLACE_WITH_USER_EMAIL>",
    $first_name: "<REPLACE_WITH_USER_NAME>",
    $last_name: "<REPLACE_WITH_USER_LAST_NAME>",
  });
</script>`;

  return (
    <Card title="In-App Widget Embed Code">
      <Text weight="bold">Copy this snippet to your code before the closing body tag.</Text>
      <Text mt={5} mb={10} weight="bold">
        Change the #notification-bell selector with the appropriate bell css selector in your app layout.
      </Text>
      <Prism
        styles={(theme) => ({
          code: {
            fontWeight: '400',
            color: `${colors.B60} !important`,
            backgroundColor: 'transparent !important',
            border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
            borderRadius: '7px',
          },
        })}
        language="jsx"
        data-test-id="embed-code-snippet"
      >
        {embedCode}
      </Prism>
    </Card>
  );
};

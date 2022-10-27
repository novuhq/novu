import React from 'react';
import { Prism } from '@mantine/prism';
import { colors, Text } from '../../../design-system';
import { WIDGET_EMEBED_PATH } from '../../../config';
import { useEnvController } from '../../../store/use-env-controller';
import { Security } from './components/Security';
import styled from '@emotion/styled';
import { InputWrapper } from '@mantine/core';
import { inputStyles } from '../../../design-system/config/inputs.styles';

export const InAppCenterCard = () => {
  const { environment } = useEnvController();
  const embedCode = `<script>
  (function(n,o,t,i,f) {
    n[i] = {}; var m = ['init', 'on']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, '${WIDGET_EMEBED_PATH}', 'novu', 'script');

  novu.init('${environment?.identifier}', '#notification-bell', {
    subscriberId: "<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>",
    email: "<REPLACE_WITH_USER_EMAIL>",
    firstName: "<REPLACE_WITH_USER_NAME>",
    lastName: "<REPLACE_WITH_USER_LAST_NAME>",
  });
</script>`;

  return (
    <>
      <InputWrapper label={'In-App Widget Embed Code'} description={<DescriptionText />} styles={inputStyles}>
        <PrismContainer>
          <Prism
            styles={(theme) => ({
              code: {
                fontWeight: 400,
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
        </PrismContainer>
      </InputWrapper>
      <Security />
    </>
  );
};

function DescriptionText() {
  return (
    <div>
      Copy this snippet to your code before the closing body tag.
      <br />
      Change the #notification-bell selector with the appropriate bell CSS selector in your app layout.
    </div>
  );
}

export const PrismContainer = styled.div`
  padding: 25px 0 32px 0;
  @media screen and (max-width: 1400px) {
    width: 600px;
  }
`;

export const StyledText = styled(Text)`
  padding: 17px 0 13px 0;
`;

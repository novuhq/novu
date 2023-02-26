import styled from '@emotion/styled';
import { Input } from '@mantine/core';

import { Text } from '../../../design-system';
import { WIDGET_EMBED_PATH } from '../../../config';
import { useEnvController } from '../../../hooks';
import { Security } from './components/Security';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { Prism } from './components/Prism';

export const InAppCenterCard = () => {
  const { environment } = useEnvController();
  const embedCode = `<script>
  (function(n,o,t,i,f) {
    n[i] = {}; var m = ['init', 'on']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, '${WIDGET_EMBED_PATH}', 'novu', 'script');

  novu.init('${environment?.identifier}', '#notification-bell', {
    subscriberId: "<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>",
    email: "<REPLACE_WITH_USER_EMAIL>",
    firstName: "<REPLACE_WITH_USER_NAME>",
    lastName: "<REPLACE_WITH_USER_LAST_NAME>",
  });
</script>`;

  return (
    <>
      <Input.Wrapper label={'In-App Widget Embed Code'} description={<DescriptionText />} styles={inputStyles}>
        <PrismContainer>
          <Prism code={embedCode} />
        </PrismContainer>
      </Input.Wrapper>
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
  margin: 25px 0 32px 0;
  @media screen and (max-width: 1400px) {
    width: 600px;
  }
`;

export const StyledText = styled(Text)`
  padding: 17px 0 13px 0;
`;

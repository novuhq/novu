import { CSSProperties } from 'react';
import { ProductLead, ProductLeadVariants } from '../../../components/utils/ProductLead';
import { Translate } from '@novu/design-system';

export const TranslateProductLead = ({ id, style = {} }: { id: string; style?: CSSProperties }) => {
  return (
    <ProductLead
      icon={<Translate />}
      id={id}
      title="Translation management"
      // eslint-disable-next-line max-len
      text="Translate your notification content to multiple languages using a connection with a preferred i18n localization provider."
      variant={ProductLeadVariants.COLUMN}
      style={style}
    />
  );
};

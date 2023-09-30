import { useEffect } from 'react';
import { APP_ID, ENV, WIDGET_EMBED_PATH } from '../config';
import { useAuthContext } from '../components/providers/AuthProvider';

export function useNovu() {
  const authContext = useAuthContext();

  useEffect(() => {
    if ((ENV === 'dev' || ENV === 'production') && authContext.currentUser) {
      // eslint-disable-next-line func-names,id-length
      (function (n, o, t, i, f) {
        /* eslint-disable */
        let m;
        (n[i] = {}), (m = ['init', 'on']);
        n[i]._c = [];
        m.forEach(
          (me) =>
            (n[i][me] = function () {
              n[i]._c.push([me, arguments]);
            })
        );
        const elt: any = o.createElement(f);
        elt.type = 'text/javascript';
        elt.async = true;
        elt.src = t;
        const before = o.getElementsByTagName(f)[0];
        before.parentNode?.insertBefore(elt, before);
      })(window, document, WIDGET_EMBED_PATH, 'novu', 'script');

      (window as any).novu.init(
        APP_ID,
        { bellSelector: '#notification-bell', unseenBadgeSelector: '#unseen-badge-selector' },
        {
          subscriberId: authContext.currentUser?._id,
          lastName: authContext.currentUser?.lastName,
          firstName: authContext.currentUser?.firstName,
          email: authContext.currentUser?.email,
        }
      );
    }
  }, [authContext.currentUser]);
}

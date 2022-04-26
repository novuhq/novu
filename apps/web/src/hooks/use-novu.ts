import { useContext, useEffect } from 'react';
import { APP_ID, ENV, WIDGET_EMEBED_PATH } from '../config';
import { AuthContext } from '../store/authContext';

export function useNovu() {
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if ((ENV === 'dev' || ENV === 'prod') && authContext.currentUser) {
      // eslint-disable-next-line func-names,id-length
      (function (n, o, t, i, f) {
        /* eslint-disable */
        let m;
        (n[i] = {}), (m = ['init']);
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
      })(window, document, WIDGET_EMEBED_PATH, 'novu', 'script');

      (window as any).novu.init(
        APP_ID,
        { bellSelector: '#notification-bell', unseenBadgeSelector: '#unseen-badge-selector' },
        {
          userId: authContext.currentUser?._id,
          lastName: authContext.currentUser?.lastName,
          firstName: authContext.currentUser?.firstName,
          email: authContext.currentUser?.email,
        }
      );
    }
  }, [authContext.currentUser]);
}

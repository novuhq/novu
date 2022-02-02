import { useContext, useEffect } from 'react';
import { AuthContext } from '../store/authContext';

export function useNotifire() {
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (
      (process.env.REACT_APP_ENVIRONMENT === 'dev' || process.env.REACT_APP_ENVIRONMENT === 'prod') &&
      authContext.currentUser
    ) {
      // eslint-disable-next-line func-names
      (function (n, o, t, i, f) {
        let m;
        /* eslint-disable */
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
      })(window, document, process.env.REACT_APP_WIDGET_SDK_PATH, 'notifire', 'script');

      (window as any).notifire.init(
        process.env.REACT_APP_NOTIFIRE_APP_ID,
        { bellSelector: '#notification-bell', unseenBadgeSelector: '#unseen-badge-selector' },
        {
          $user_id: authContext.currentUser?._id,
          $last_name: authContext.currentUser?.lastName,
          $first_name: authContext.currentUser?.firstName,
          $email: authContext.currentUser?.email,
        }
      );
    }
  }, [authContext.currentUser]);
}

# iFrame Embed

If you are using an unsupported (yet) client framework, you can use our embed script, this will generate the notification center inside an iframe.
You can find the embed code in the `Settings` page within the Admin Panel. It will look similar to this:

```html
<script>
  (function(n,o,t,i,f) {
    n[i] = {}, m = ['init']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, 'https://embed.novu.co/embed.umd.min.js', 'novu', 'script');

  novu.init('<REPLACE_APPLICATION_ID>', { 
    unseenBadgeSelector: '#unseen-badge', 
    bellSelector: '#notification-bell' 
  }, {
    subscriberId: "<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>",
    email: "<REPLACE_WITH_USER_EMAIL>",
    first_name: "<REPLACE_WITH_USER_NAME>",
    last_name: "<REPLACE_WITH_USER_LAST_NAME>",
  });
</script>
```

Replace the selectors for the bell icon and the unseen badge withing your code. Let's take a look at this example code:

```html
  <nav>
    <div id="notification-bell">
      <i class="fa fa-bell"></i>
      <span id="unseen-badge"></span>
    </div>
  </nav>
```

## Customizing the dropdown position

Optionally the embed init script receives a position object, you can use it to specify the `left` and `top` position of the notification center.

```html
<script>
  novu.init('<REPLACE_APPLICATION_ID>', {
    unseenBadgeSelector: '#unseen-badge',
    bellSelector: '#notification-bell',
    position: {
      top: '50px',
      left: '100px'
    }
  }, {
    ...subscriberProps
  });
</script>
```

### Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to visit the admin panel in-app settings page and enable HMAC encryption for your environment.

Next step would be to generate an HMAC encrypted subscriberId on your backend:

```ts
import { createHmac } from 'crypto';

const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY)
  .update(subscriberId)
  .digest('hex');
```

Then pass the created HMAC to your client side application forward it to the embed initialization script:

```ts
novu.init('<REPLACE_APPLICATION_ID>', {
  unseenBadgeSelector: '#unseen-badge',
  bellSelector: '#notification-bell',
  position: {
    top: '50px',
    left: '100px'
  }
}, {
  subscriberId: 'REPLACE_WITH_PLAIN_VALUE',
  subscriberHash: 'REPLACE_WITH_HASHED_VALUE' 
})
```

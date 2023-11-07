# Novu GrafanaOnCall Provider

A GrafanaOnCall chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
    import { GrafanaOnCallChatProvider } from '@novu/grafana-on-call';

    const provider = new GrafanaOnCallChatProvider({ alertUid: "123", externalLink: "link", imageUrl: "url", state: "ok", title: "title" });
```

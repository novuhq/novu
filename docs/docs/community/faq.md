---
sidebar_position: 3
---
# FAQ

### Are you working on `[feature]`?

We're working as fast as we can! We are working on building new features as well as providers, in case something is missing please check our [Github Discussions][github-discussions],
to quickly summarize:

- A Unified API for triggering all type of product based notifications.
- Easy to use provider registration as well as [provider template](create-provider.md) to create new ones.
- Proper declarative template store, that is easy to manage, outside your code business logic.
- JavaScript/Nodejs library and APIs, implementing [OCL](../overview/outgoing-communication-layer.md).
- Theming, properties, and filters for templates, so you won't need to write that in your code.

### Why should this and not `[provider name]`?

While it is perfectly reasonable to just use `[provider name]`, it generates multiple issues, first and foremost, separation of concerns,
a business logic unit, should not manage provider API, just you business logic. Secondly, once you started using `[provider name]` in your code,
you start manage templates, permutations and filters in your code, hence the code becomes unreadable and tightly coupled. OCL solves this.

### Do you support `[provider name]`?

You can see our providers in this [providers directory][providers-list], if something is missing you are more than welcome to suggest or upvote a provider [here][github-discussions].
Lastly you can create you very own provider, following the this [guide](create-provider.md).

### Do you have a library for `[some other language]`?

We currently have a JavaScript library. You can [vote on or suggest a new client library][github-discussions] for your favorite language.
There is a similar library for python called [Notifiers](https://github.com/liiight/notifiers).
While Notifiers is not exactly the same, it does solve a lot of the issues, mainly around provider coupling.

[github-discussions]: https://github.com/notifirehq/novu/discussions
[providers-list]: https://www.novu.co/providers-list

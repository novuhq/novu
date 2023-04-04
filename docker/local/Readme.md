## Running novu locally

For a full guide on running novu locally for development needs, please read our guide here: https://docs.novu.co/community/run-locally

### Redis Cluster

Novu has support for redis cluster, however you must set the following env variables to:
// FIXME

In the local development example, the primary nodes are hard coded to 6391 through 6393 and
the secondary (read) node to 6381 through 6383 on localhost.
We have also set up redis commander on 5001 for you to be able to see the keys and statistics of the cluster.

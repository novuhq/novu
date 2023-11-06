## Running novu locally

For a full guide on running novu locally for development needs, please read our guide here: https://docs.novu.co/community/run-in-local-machine

### Advanced - Running with a Redis Cluster

Novu has support for [redis cluster](https://redis.io/docs/management/scaling/), however you must set the following env variables to enable it:

// To be determined

In the local development example in the docker-compose.redis-cluster.yml file, the primary nodes are hard coded to 6391 through 6393 and
the secondary (read) node to 6394 through 6396 on localhost.
In addition, for the queue service there is a redis sentinel cluster that has ones primary and two read nodes
with append-only file enabled that run on ports 6381 through 6383 on localhost.
We have also set up redis commander on 5001 for you to be able to see the keys and statistics of the cluster.

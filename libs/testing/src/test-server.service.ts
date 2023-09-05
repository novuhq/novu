export class TestServer {
  private app;

  getHttpServer() {
    return this.app.getHttpServer();
  }

  getService(service) {
    return this.app.get(service);
  }

  async create(app) {
    this.app = app;
  }

  async teardown() {
    try {
      if (this.app) {
        await this.app.close();
      }
    } catch (error) {
      console.error('Error when closing TestServer', error.message);
    }
  }
}

export const testServer = new TestServer();

export class WsTestServer {
  private app;

  getHttpServer() {
    return this.app.getHttpServer();
  }

  getService(service) {
    return this.app.get(service);
  }

  async create(app) {
    this.app = app;
  }

  async teardown() {
    try {
      if (this.app) {
        await this.app.close();
      }
    } catch (error) {
      console.error('Error when closing WsServer', error.message);
    }
  }
}

export const wsTestServer = new WsTestServer();

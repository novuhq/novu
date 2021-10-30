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
    await this.app.close();
  }
}

export const testServer = new TestServer();

import { Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

export class TenantsPage {
  public async createNewTenant() {
    const name = faker.name.firstName();
    await this.page.getByTestId('add-tenant').click();
    await this.page.getByTestId('tenant-name').fill(name);
    await this.page.getByTestId('tenant-identifier').fill(faker.datatype.uuid());
    await this.page.getByTestId('create-tenant-sidebar-submit').click();

    return name;
  }
  constructor(private page: Page) {}

  public static async goTo(page: Page) {
    await page.goto('/tenants');

    return new TenantsPage(page);
  }
  public async clickElementByText(text: string) {
    await this.page.getByText(text).click();
  }
}

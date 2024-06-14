import { APIResponse, Page } from '@playwright/test';
import { JsonUtils } from '../utils/jsonUtils';

export class OrganizationRouteMocks {
  public static async augmentOrganizationCallServiceLevel(page: Page, apiServiceLevel: string) {
    await page.route('**/v1/organizations', async (route) => {
      const response: APIResponse = await route.fetch();
      const buffer: Buffer = await response.body();
      let bodyString = buffer.toString('utf8'); // Convert Buffer to string using utf8 encoding
      if (JsonUtils.isJsonString(bodyString)) {
        const jsonObject = JSON.parse(bodyString);
        const orgsWithServiceLevelAltered = jsonObject.data.map((org) => {
          return {
            ...org,
            apiServiceLevel,
          };
        });
        bodyString = JSON.stringify({ data: orgsWithServiceLevelAltered });
      }
      await route.fulfill({
        // Pass all fields from the response.
        response,
        // Override response body.
        body: bodyString,
        // Force content type to be html.
        headers: {
          ...response.headers(),
        },
      });
    });
  }
  public static async augmentOrganizationToServiceLevelBusiness(page: Page) {
    await OrganizationRouteMocks.augmentOrganizationCallServiceLevel(page, 'business');
  }
}

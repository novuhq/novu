// August 14th, 2023

import * as shortid from 'shortid';
import slugify from 'slugify';

import { LayoutRepository, OrganizationRepository } from '@novu/dal';

export async function addLayoutIdentifierMigration() {
  // eslint-disable-next-line no-console
  console.log('start migration - add layout identifier migration');

  const organizationRepository = new OrganizationRepository();
  const layoutRepository = new LayoutRepository();

  const organizations = await organizationRepository.find({});

  for (const organization of organizations) {
    // eslint-disable-next-line no-console
    console.log(`organization ${organization._id}`);

    const layouts = await layoutRepository.find({
      _organizationId: organization._id,
      _parentId: { $exists: false, $eq: null },
      identifier: { $exists: false, $eq: null },
    });

    const bulkWriteOps = layouts
      .map((layout) => {
        const { _id, name } = layout;
        const identifier = `${slugify(name, { lower: true, strict: true })}-${shortid.generate()}`;

        return [
          {
            updateOne: {
              filter: { _id, _organizationId: organization._id },
              update: { $set: { identifier } },
            },
          },
          {
            updateOne: {
              filter: { _parentId: _id, _organizationId: organization._id },
              update: { $set: { identifier } },
            },
          },
        ];
      })
      .flat();

    let bulkResponse;
    try {
      bulkResponse = await layoutRepository.bulkWrite(bulkWriteOps);
    } catch (e) {
      bulkResponse = e.result;
    }
    // eslint-disable-next-line no-console
    console.log(
      `${bulkResponse.result.nMatched} matched, ${
        bulkResponse.result.nModified
      } modified, ${bulkResponse.getWriteErrorCount()} errors`
    );
  }
  // eslint-disable-next-line no-console
  console.log('end migration');
}

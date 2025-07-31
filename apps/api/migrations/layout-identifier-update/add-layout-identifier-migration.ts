// August 14th, 2023

import { LayoutRepository, OrganizationRepository } from '@novu/dal';
import { slugify } from '@novu/shared';
import shortid from 'shortid';

export async function addLayoutIdentifierMigration() {
  console.log('start migration - add layout identifier migration');

  const organizationRepository = new OrganizationRepository();
  const layoutRepository = new LayoutRepository();

  const organizations = await organizationRepository.find({});

  for (const organization of organizations) {
    console.log(`organization ${organization._id}`);

    const layouts = await layoutRepository.find({
      _organizationId: organization._id,
      _parentId: { $exists: false, $eq: null },
      identifier: { $exists: false, $eq: null },
    });

    const bulkWriteOps = layouts.flatMap((layout) => {
      const { _id, name } = layout;
      const identifier = `${slugify(name)}-${shortid.generate()}`;

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
    });

    let bulkResponse;
    try {
      bulkResponse = await layoutRepository.bulkWrite(bulkWriteOps);
    } catch (e) {
      bulkResponse = e.result;
    }
    console.log(
      `${bulkResponse.result.nMatched} matched, ${
        bulkResponse.result.nModified
      } modified, ${bulkResponse.getWriteErrorCount()} errors`
    );
  }
  console.log('end migration');
}

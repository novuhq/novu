import { Injectable, Scope } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import * as dns from 'dns';
import { IJwtPayload } from '@novu/shared';
import { EnvironmentEntity } from '@novu/dal';

@Injectable({
  scope: Scope.REQUEST,
})
export class ValidateMxRecord {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: IJwtPayload): Promise<any> {
    const env = await this.environmentRepository.findOne({ _id: command.environmentId });

    const domain = env.dns?.domain;

    if (!domain) return false;

    const relativeDnsRecords = await this.getMxRecords(domain);

    const mxRecordExist = relativeDnsRecords.some(
      (record: dns.MxRecord) => record.exchange === process.env.MAIL_SERVER_DOMAIN
    );

    const mxRecordConfigured = env.dns?.mxRecordConfigured;

    const res = Object.assign({}, env.dns, { mxRecordConfigured: mxRecordExist });

    if (mxRecordExist === mxRecordConfigured) return res;

    const updatePayload: Partial<EnvironmentEntity> = {};

    updatePayload[`dns.mxRecordConfigured`] = mxRecordExist;

    await this.environmentRepository.update(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: updatePayload }
    );

    // eslint-disable-next-line no-console
    console.log('res ', res);

    return res;
  }

  async getMxRecords(domain: string): Promise<dns.MxRecord[]> {
    // const [username, domain] = email.split('@');
    try {
      return await dns.promises.resolveMx(domain);
    } catch (e) {
      return [];
    }
  }
}

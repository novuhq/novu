# DigestMetadataDto

## Example Usage

```typescript
import { DigestMetadataDto } from "@novu/api/models/components";

let value: DigestMetadataDto = {
  type: "timed",
};
```

## Fields

| Field                                                                                | Type                                                                                 | Required                                                                             | Description                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `digestKey`                                                                          | *string*                                                                             | :heavy_minus_sign:                                                                   | Optional key for the digest                                                          |
| `amount`                                                                             | *number*                                                                             | :heavy_minus_sign:                                                                   | Amount for the digest                                                                |
| `unit`                                                                               | [components.DigestMetadataDtoUnit](../../models/components/digestmetadatadtounit.md) | :heavy_minus_sign:                                                                   | Unit of the digest                                                                   |
| `type`                                                                               | [components.DigestTypeEnum](../../models/components/digesttypeenum.md)               | :heavy_check_mark:                                                                   | The Digest Type                                                                      |
| `events`                                                                             | Record<string, *any*>[]                                                              | :heavy_minus_sign:                                                                   | Optional array of events associated with the digest, represented as key-value pairs  |
| `backoff`                                                                            | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Regular digest: Indicates if backoff is enabled for the regular digest               |
| `backoffAmount`                                                                      | *number*                                                                             | :heavy_minus_sign:                                                                   | Regular digest: Amount for backoff                                                   |
| `backoffUnit`                                                                        | [components.DigestUnitEnum](../../models/components/digestunitenum.md)               | :heavy_minus_sign:                                                                   | Regular digest: Unit for backoff                                                     |
| `updateMode`                                                                         | *boolean*                                                                            | :heavy_minus_sign:                                                                   | Regular digest: Indicates if the digest should update                                |
| `timed`                                                                              | [components.DigestTimedConfigDto](../../models/components/digesttimedconfigdto.md)   | :heavy_minus_sign:                                                                   | Configuration for timed digest                                                       |
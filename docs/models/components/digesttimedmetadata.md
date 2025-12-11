# DigestTimedMetadata

## Example Usage

```typescript
import { DigestTimedMetadata } from "@novu/api/models/components";

let value: DigestTimedMetadata = {
  type: "timed",
};
```

## Fields

| Field                                                                                    | Type                                                                                     | Required                                                                                 | Description                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `amount`                                                                                 | *number*                                                                                 | :heavy_minus_sign:                                                                       | N/A                                                                                      |
| `unit`                                                                                   | [components.DigestTimedMetadataUnit](../../models/components/digesttimedmetadataunit.md) | :heavy_minus_sign:                                                                       | N/A                                                                                      |
| `digestKey`                                                                              | *string*                                                                                 | :heavy_minus_sign:                                                                       | N/A                                                                                      |
| `type`                                                                                   | [components.DigestTimedMetadataType](../../models/components/digesttimedmetadatatype.md) | :heavy_check_mark:                                                                       | N/A                                                                                      |
| `timed`                                                                                  | [components.TimedConfig](../../models/components/timedconfig.md)                         | :heavy_minus_sign:                                                                       | N/A                                                                                      |
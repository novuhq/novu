import {
  FeatureFlagsKeysEnum,
  MIME_TYPE_TO_FILE_EXTENSION,
  MimeTypesEnum,
  UploadTypesEnum,
} from '@novu/shared';
import { useCallback } from 'react';
import { getSignedUploadUrl } from '@/api/storage';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export const MAX_EMAIL_ASSET_SIZE_BYTES = 2 * 1024 * 1024;

// SVG is intentionally excluded: most email clients don't render it and it can carry scripts.
export const EMAIL_ASSET_MIME_TYPES: MimeTypesEnum[] = [
  MimeTypesEnum.JPEG,
  MimeTypesEnum.PNG,
  MimeTypesEnum.GIF,
  MimeTypesEnum.WEBP,
];

export function useEmailAssetUpload() {
  const { currentEnvironment } = useEnvironment();
  const isFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_EMAIL_ASSET_UPLOAD_ENABLED);

  const uploadAsset = useCallback(
    async (file: Blob): Promise<string> => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      const mimeType = file.type as MimeTypesEnum;

      if (!EMAIL_ASSET_MIME_TYPES.includes(mimeType)) {
        showErrorToast('Only JPEG, PNG, GIF and WebP images can be uploaded');
        throw new Error(`Unsupported image type: ${file.type}`);
      }

      if (file.size > MAX_EMAIL_ASSET_SIZE_BYTES) {
        showErrorToast('Images must be smaller than 2 MB');
        throw new Error('Image exceeds the 2 MB size limit');
      }

      try {
        const { data } = await getSignedUploadUrl({
          environment: currentEnvironment,
          extension: MIME_TYPE_TO_FILE_EXTENSION[mimeType],
          type: UploadTypesEnum.EMAIL_ASSET,
        });

        const uploadResponse = await fetch(data.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
            ...data.additionalHeaders,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed with status ${uploadResponse.status}`);
        }

        return data.path;
      } catch (error) {
        showErrorToast('Failed to upload the image, please try again');
        throw error;
      }
    },
    [currentEnvironment]
  );

  return { isEnabled: isFlagEnabled, uploadAsset };
}

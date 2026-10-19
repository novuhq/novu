/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { formatDistanceToNow } from 'date-fns';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiDeleteBin2Line, RiSettings4Line } from 'react-icons/ri';
import { useBlocker, useNavigate } from 'react-router-dom';
import { ExternalToast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/primitives/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast, showToast } from '@/components/primitives/sonner-helpers';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useEnvironment } from '@/context/environment/hooks';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useDeleteLayout } from '@/hooks/use-delete-layout';
import { useUpdateLayout } from '@/hooks/use-update-layout';
import { LocalizationResourceEnum } from '@/types/translations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { CopyButton } from '../primitives/copy-button';
import { PermissionButton } from '../primitives/permission-button';
import { Separator } from '../primitives/separator';
import { ToastIcon } from '../primitives/sonner';
import TruncatedText from '../truncated-text';
import { TranslationToggleSection } from '../workflow-editor/translation-toggle-section';
import { DeleteLayoutDialog } from './delete-layout-dialog';
import { useLayoutEditor } from './layout-editor-provider';
import { layoutSchema } from './schema';

type LayoutSettingsFormData = z.infer<typeof layoutSchema>;

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

type LayoutEditorSettingsDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const LayoutEditorSettingsDrawer = forwardRef<HTMLDivElement, LayoutEditorSettingsDrawerProps>(
  ({ isOpen, onOpenChange }, forwardedRef) => {
    const navigate = useNavigate();
    const { layout } = useLayoutEditor();
    const { currentEnvironment } = useEnvironment();
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const isReadOnly =
      layout?.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

    const form = useForm({
      resolver: standardSchemaResolver(layoutSchema),
      defaultValues: {
        name: layout?.name || '',
        layoutId: layout?.layoutId || '',
        isTranslationEnabled: layout?.isTranslationEnabled || false,
      },
    });

    const wasOpenRef = useRef(false);
    useEffect(() => {
      if (isOpen && !wasOpenRef.current && layout) {
        form.reset({
          name: layout.name || '',
          layoutId: layout.layoutId || '',
          isTranslationEnabled: layout.isTranslationEnabled || false,
        });
      }
      wasOpenRef.current = isOpen;
    }, [isOpen, layout, form]);

    const hasUnsavedChanges = form.formState.isDirty;

    useBeforeUnload(hasUnsavedChanges);

    const blocker = useBlocker(({ nextLocation }) => {
      if (!hasUnsavedChanges) return false;

      const layoutEditorBasePath = buildRoute(ROUTES.LAYOUTS_EDIT, {
        environmentSlug: currentEnvironment?.slug ?? '',
        layoutSlug: layout?.slug ?? '',
      });

      const isLeavingEditor = !nextLocation.pathname.startsWith(layoutEditorBasePath);
      return isLeavingEditor;
    });

    const { updateLayout, isPending: isUpdating } = useUpdateLayout({
      onSuccess: (data) => {
        form.reset({
          name: data.name || '',
          layoutId: data.layoutId || '',
          isTranslationEnabled: data.isTranslationEnabled || false,
        });
        showSuccessToast('Layout updated successfully', '', toastOptions);
        onOpenChange(false);
      },
      onError: () => {
        showErrorToast('Failed to update layout', 'Please try again later.', toastOptions);
      },
    });

    const { deleteLayout, isPending: isDeleteLayoutPending } = useDeleteLayout({
      onSuccess: () => {
        showToast({
          children: () => (
            <>
              <ToastIcon variant="success" />
              <span className="text-sm">
                Deleted layout <span className="font-bold">{layout?.name}</span>
              </span>
            </>
          ),
          options: toastOptions,
        });
        navigate(
          buildRoute(ROUTES.LAYOUTS, {
            environmentSlug: currentEnvironment?.slug ?? '',
          })
        );
      },
      onError: () => {
        showToast({
          children: () => (
            <>
              <ToastIcon variant="error" />
              <span className="text-sm">
                Failed to delete layout <span className="font-bold">{layout?.name}</span>
              </span>
            </>
          ),
          options: toastOptions,
        });
      },
    });

    const onDeleteLayout = async () => {
      if (!layout) return;

      try {
        await deleteLayout({
          layoutSlug: layout.slug,
        });
      } catch {}
    };

    const onSubmit = async (data: LayoutSettingsFormData) => {
      if (!layout) return;

      try {
        await updateLayout({
          layout: {
            name: data.name,
            isTranslationEnabled: data.isTranslationEnabled,
            controlValues: layout.controls.values || {},
          },
          layoutSlug: layout.slug,
        });
      } catch {}
    };

    const checkUnsavedChanges = useCallback(
      (action: () => void) => {
        if (hasUnsavedChanges) {
          setPendingAction(() => action);
          setShowUnsavedDialog(true);
        } else {
          action();
        }
      },
      [hasUnsavedChanges]
    );

    const handleCloseAttempt = useCallback(
      (event?: Event | KeyboardEvent) => {
        event?.preventDefault();
        checkUnsavedChanges(() => onOpenChange(false));
      },
      [checkUnsavedChanges, onOpenChange]
    );

    const handleConfirmClose = useCallback(() => {
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      setShowUnsavedDialog(false);
      form.reset();
    }, [pendingAction, form]);

    const handleCancelChange = useCallback(() => {
      setPendingAction(null);
      setShowUnsavedDialog(false);
    }, []);

    const handleBlockerProceed = useCallback(() => {
      if (blocker.state === 'blocked') {
        blocker.proceed?.();
      }
    }, [blocker]);

    const handleBlockerReset = useCallback(() => {
      if (blocker.state === 'blocked') {
        blocker.reset?.();
      }
    }, [blocker]);

    if (!layout) {
      return null;
    }

    return (
      <>
        <Sheet modal={false} open={isOpen} onOpenChange={(open) => checkUnsavedChanges(() => onOpenChange(open))}>
          {/* Custom overlay since SheetOverlay does not work with modal={false} */}
          <div
            className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
              'pointer-events-none opacity-0': !isOpen,
            })}
          />
          <SheetContent
            ref={forwardedRef}
            className="w-[480px]"
            onInteractOutside={handleCloseAttempt}
            onEscapeKeyDown={handleCloseAttempt}
          >
            <Form {...form}>
              <FormRoot
                id="layout-settings"
                autoComplete="off"
                noValidate
                onSubmit={(e) => {
                  e.stopPropagation();
                  form.handleSubmit(onSubmit)(e);
                }}
                className="flex h-full flex-col"
              >
                <VisuallyHidden>
                  <SheetTitle />
                  <SheetDescription />
                </VisuallyHidden>
                <SheetHeader className="p-0">
                  <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b p-3.5">
                    <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
                      <RiSettings4Line className="size-5 p-0.5" />
                      <TruncatedText className="flex-1">Manage layout</TruncatedText>
                    </div>
                  </header>
                </SheetHeader>

                <SheetMain className="flex h-auto flex-col gap-4 p-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Layout name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter layout name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="layoutId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Identifier</FormLabel>
                        <FormControl>
                          <Input
                            size="xs"
                            trailingNode={<CopyButton valueToCopy={field.value} />}
                            placeholder="Untitled"
                            className="cursor-default"
                            {...field}
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isTranslationEnabled"
                    render={({ field }) => (
                      <TranslationToggleSection
                        value={field.value ?? false}
                        onChange={field.onChange}
                        isReadOnly={isReadOnly}
                        resourceId={layout?.layoutId}
                        resourceType={LocalizationResourceEnum.LAYOUT}
                        showDrawer={!!(layout?.layoutId && layout?.isTranslationEnabled)}
                      />
                    )}
                  />
                </SheetMain>
                <Separator />
                <span className="text-label-xs text-text-soft mx-4 my-1">{`Last updated ${formatDistanceToNow(layout.updatedAt, { addSuffix: true })}`}</span>
                <Separator className="mt-auto" />
                <SheetFooter className="p-0">
                  <div className="flex w-full items-center justify-between gap-3 p-3">
                    <PermissionButton
                      permission={PermissionsEnum.WORKFLOW_WRITE}
                      variant="primary"
                      mode="ghost"
                      leadingIcon={RiDeleteBin2Line}
                      onClick={() => {
                        setIsDeleteDialogOpen(true);
                      }}
                      disabled={isDeleteLayoutPending}
                    >
                      Delete layout
                    </PermissionButton>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={!form.formState.isDirty || isUpdating}
                      isLoading={isUpdating}
                      className="ml-auto"
                    >
                      Save changes
                    </Button>
                  </div>
                </SheetFooter>
              </FormRoot>
            </Form>
          </SheetContent>
        </Sheet>

        <UnsavedChangesAlertDialog
          show={showUnsavedDialog}
          description="You have unsaved changes to the layout settings. These changes will be lost if you continue."
          onCancel={handleCancelChange}
          onProceed={handleConfirmClose}
        />

        <UnsavedChangesAlertDialog
          show={blocker.state === 'blocked'}
          description="You have unsaved changes to the layout settings. These changes will be lost if you leave this page."
          onCancel={handleBlockerReset}
          onProceed={handleBlockerProceed}
        />

        <DeleteLayoutDialog
          layout={layout}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={onDeleteLayout}
          isLoading={isDeleteLayoutPending}
        />
      </>
    );
  }
);

LayoutEditorSettingsDrawer.displayName = 'LayoutEditorSettingsDrawer';

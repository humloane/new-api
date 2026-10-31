import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ImagePlus, Sparkles, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getUserGroups, getUserModels } from '@/features/playground/api'
import { getPricing } from '@/features/pricing/api'
import { formatFixedPrice } from '@/features/pricing/lib/price'
import { handleServerError } from '@/lib/handle-server-error'
import {
  getServerErrorMessage,
  requireServerSuccess,
} from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { WorkbenchAuthGate } from '../auth-gate'
import { requestImages } from './api'
import { getImageCatalog } from './catalog'
import { ImageGallery } from './ImageGallery'
import {
  ALL_IMAGE_SIZES,
  getImageSizes,
  describeImageSize,
  isExperimentalImageSize,
  preserveImagePrompt,
  readImageDataURL,
  restoreImagePrompt,
  validateReferenceImage,
  type CanvasImage,
  type GeneratedImage,
} from './images'

const schema = z.object({
  prompt: z.string().trim().min(1, 'Describe the image you want to create.'),
  size: z.enum(ALL_IMAGE_SIZES),
})
type ImageForm = z.infer<typeof schema>
export interface ImageStudioProps {
  onOpenCanvas: (images: CanvasImage[]) => void
}

export function ImageStudio(props: ImageStudioProps) {
  const user = useAuthStore((state) => state.auth.user)
  return <ImageStudioSession key={user?.id ?? 'anonymous'} {...props} />
}

function ImageStudioSession(props: ImageStudioProps) {
  const { t } = useTranslation()
  const id = useId()
  const user = useAuthStore((state) => state.auth.user)
  const owner = user?.id ?? null
  useSystemConfigStore((state) => state.config.currency)
  const [authOpen, setAuthOpen] = useState(false)
  const [reference, setReference] = useState<{
    file: File
    preview: string
  } | null>(null)
  const [fileError, setFileError] = useState('')
  const [reading, setReading] = useState(false)
  const [group, setGroup] = useState(user ? (user.group ?? 'default') : '')
  const [groupChosen, setGroupChosen] = useState(!user)
  const [modelName, setModelName] = useState('')
  const [images, setImages] = useState<GeneratedImage[]>([])
  const submitting = useRef(false)
  const fileVersion = useRef(0)
  const form = useForm<ImageForm>({
    resolver: zodResolver(schema),
    defaultValues: { prompt: restoreImagePrompt(owner), size: '1024x1024' },
  })
  useEffect(() => {
    const subscription = form.watch((values) =>
      preserveImagePrompt(values.prompt ?? '', owner)
    )
    return () => subscription.unsubscribe()
  }, [form, owner])
  const pricing = useQuery({
    queryKey: ['workbench', 'catalog', owner, user?.group],
    refetchOnMount: 'always',
    queryFn: async () => requireServerSuccess(await getPricing()),
    staleTime: 60_000,
  })
  const selfGroups = useQuery({
    queryKey: ['workbench', user?.id, 'groups', user?.group],
    queryFn: getUserGroups,
    enabled: Boolean(user),
  })
  const catalog = getImageCatalog(
    pricing.data,
    Boolean(reference),
    user ? (selfGroups.data ?? []) : undefined
  )
  const groups = user ? (selfGroups.data ?? []) : catalog.groups
  const selectedGroup = user ? group : group || groups[0]?.value || ''
  const userModels = useQuery({
    queryKey: ['workbench', user?.id, 'models', selectedGroup, user?.group],
    queryFn: () => getUserModels(selectedGroup),
    enabled:
      Boolean(user) &&
      groups.some((candidate) => candidate.value === selectedGroup),
  })
  const models = catalog.models.filter(
    (model) =>
      model.enable_groups?.includes(selectedGroup) &&
      (!user ||
        userModels.data?.some((allowed) => allowed.value === model.model_name))
  )
  const selectedModel =
    modelName || (groupChosen ? models[0]?.model_name : '') || ''
  const model = models.find(
    (candidate) => candidate.model_name === selectedModel
  )
  const catalogReady =
    pricing.isSuccess &&
    !pricing.isFetching &&
    (!user ||
      (selfGroups.isSuccess &&
        !selfGroups.isFetching &&
        userModels.isSuccess &&
        !userModels.isFetching))
  useEffect(() => {
    if (!catalogReady || !groupChosen) return
    // Freeze defaults once fetched, so a later catalog update cannot change a
    // pending paid request to a different route or model without user input.
    if (!group && selectedGroup) setGroup(selectedGroup)
    if (!modelName && selectedModel) setModelName(selectedModel)
  }, [
    catalogReady,
    group,
    selectedGroup,
    modelName,
    selectedModel,
    groupChosen,
  ])
  const selectionValid = Boolean(
    catalogReady &&
    model &&
    groups.some((candidate) => candidate.value === selectedGroup)
  )
  const generation = useMutation({
    mutationFn: requestImages,
    retry: false,
    onSuccess: setImages,
    onError: (error) => handleServerError(error, t('Image generation failed.')),
    meta: { errorToast: false },
  })
  const busy = generation.isPending || reading
  let submitLabel = reference ? t('Edit image') : t('Generate image')
  if (generation.isPending) submitLabel = t('Creating image...')
  const availableSizes = getImageSizes(selectedModel)
  const selectedSize = form.watch('size')
  const resolutionAllowed = availableSizes.includes(selectedSize)
  const largeResolution =
    selectedSize !== 'auto' &&
    !['1024x1024', '1536x1024', '1024x1536'].includes(selectedSize)
  const activeGroup = catalog.groups.find(
    (candidate) => candidate.value === selectedGroup
  )
  const ratio = Number(activeGroup?.ratio)
  let price: string | null = null
  if (
    model?.quota_type === 1 &&
    !model.billing_expr &&
    model.billing_mode !== 'tiered_expr' &&
    typeof model.model_price === 'number' &&
    Number.isFinite(model.model_price) &&
    model.model_price >= 0 &&
    activeGroup &&
    Number.isFinite(ratio) &&
    ratio >= 0
  ) {
    price = formatFixedPrice(model, selectedGroup, false, 1, 1, {
      [selectedGroup]: ratio,
    })
  }

  async function submit(values: ImageForm): Promise<void> {
    preserveImagePrompt(values.prompt, owner)
    if (owner === null || useAuthStore.getState().auth.user?.id !== owner) {
      setAuthOpen(true)
      return
    }
    if (
      submitting.current ||
      busy ||
      !selectionValid ||
      !resolutionAllowed ||
      selfGroups.isFetching ||
      pricing.isFetching
    ) {
      return
    }
    submitting.current = true
    try {
      await generation.mutateAsync({
        ...values,
        group: selectedGroup,
        model: selectedModel,
        reference: reference?.file,
      })
    } catch {
      /* Mutation owns error presentation. */
    } finally {
      submitting.current = false
    }
  }
  async function upload(file: File): Promise<void> {
    const version = ++fileVersion.current
    setReading(true)
    setFileError('')
    try {
      await validateReferenceImage(file)
      const preview = await readImageDataURL(file)
      if (version !== fileVersion.current) return
      setReference({ file, preview })
      setModelName('')
      setGroup(user ? (user.group ?? 'default') : '')
      setGroupChosen(!user)
      generation.reset()
    } catch (error) {
      if (version === fileVersion.current) {
        setFileError(
          getServerErrorMessage(error, t('Could not read this image.'))
        )
      }
    } finally {
      if (version === fileVersion.current) setReading(false)
    }
  }

  let emptyDescription = t(
    'No image models are published for your available groups yet. Keep your prompt here, or upload an image directly to the canvas.'
  )
  if (reference) {
    emptyDescription = t(
      'Image editing requires explicit model support. Remove the reference image to view generation models, or use the canvas upload and drawing tools.'
    )
  }
  if (!user) {
    emptyDescription = t(
      'Sign in to see your available image routes and models. You can prepare a prompt first.'
    )
  }

  return (
    <section
      aria-label={t('AI image studio')}
      className='mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6'
    >
      <div>
        <h2 className='text-xl font-semibold text-white'>
          {reference ? t('Edit an image') : t('Generate an image')}
        </h2>
        <p className='mt-1 text-sm text-slate-400'>
          {reference
            ? t(
                'Describe changes to the whole image. Local mask editing is not available yet.'
              )
            : t(
                'Turn a description into an image, then bring it onto your canvas.'
              )}
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='prompt'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Image prompt')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t(
                      'Describe your subject, style, composition and lighting...'
                    )}
                    disabled={busy}
                    className='min-h-28 resize-y'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='min-w-0 space-y-2'>
              <Label htmlFor={`${id}-group`}>{t('Image group')}</Label>
              <Select
                value={selectedGroup || null}
                onValueChange={(value) => {
                  if (!value) return
                  setGroupChosen(true)
                  setGroup(value)
                  setModelName('')
                  generation.reset()
                }}
                disabled={busy || !groups.length}
              >
                <SelectTrigger id={`${id}-group`} className='w-full'>
                  <SelectValue placeholder={t('Select a group')} />
                </SelectTrigger>
                <SelectContent
                  align='start'
                  alignItemWithTrigger={false}
                  className='w-max max-w-[calc(100vw-2rem)] min-w-[min(18rem,calc(100vw-2rem))] [&_[data-slot=select-item-text]]:min-w-0 [&_[data-slot=select-item-text]]:shrink [&_[data-slot=select-item-text]]:break-words [&_[data-slot=select-item-text]]:whitespace-normal'
                >
                  {groups.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='min-w-0 space-y-2'>
              <Label htmlFor={`${id}-model`}>{t('Image model')}</Label>
              <Select
                value={selectedModel || null}
                onValueChange={(value) => {
                  if (!value) return
                  setModelName(value)
                  generation.reset()
                }}
                disabled={busy || !models.length}
              >
                <SelectTrigger id={`${id}-model`} className='w-full'>
                  <SelectValue placeholder={t('Select a model')} />
                </SelectTrigger>
                <SelectContent
                  align='start'
                  alignItemWithTrigger={false}
                  className='w-max max-w-[calc(100vw-2rem)] min-w-[min(18rem,calc(100vw-2rem))] [&_[data-slot=select-item-text]]:min-w-0 [&_[data-slot=select-item-text]]:shrink [&_[data-slot=select-item-text]]:break-words [&_[data-slot=select-item-text]]:whitespace-normal'
                >
                  {models.map((option) => (
                    <SelectItem
                      key={option.model_name}
                      value={option.model_name}
                    >
                      {option.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField
              control={form.control}
              name='size'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Image dimensions')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={busy}
                  >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {describeImageSize(size)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!resolutionAllowed && (
                    <p role='alert' className='text-xs text-amber-500'>
                      {t(
                        'Select a supported resolution after changing the model.'
                      )}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
          <p className='text-xs text-slate-400'>
            {t(
              'Resolution and aspect ratio are different. 2K and 4K options depend on the selected model and upstream channel.'
            )}
          </p>
          {isExperimentalImageSize(selectedSize) && (
            <p className='text-xs text-amber-500'>
              {t(
                'This model documents resolutions above 2560 × 1440 as experimental. Confirm channel support before generating.'
              )}
            </p>
          )}
          <div className='rounded-xl border border-white/10 p-3'>
            <Label htmlFor={`${id}-reference`}>
              {t('Reference image (optional)')}
            </Label>
            <input
              id={`${id}-reference`}
              type='file'
              accept='image/png,image/jpeg,image/webp'
              disabled={busy}
              aria-describedby={`${id}-file-help`}
              aria-invalid={Boolean(fileError)}
              className='mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white'
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void upload(file)
              }}
            />
            <p id={`${id}-file-help`} className='mt-2 text-xs text-slate-400'>
              {t(
                'PNG, JPEG or WebP, up to 10 MB. Uploading switches to prompt-guided editing.'
              )}
            </p>
            {fileError && (
              <p role='alert' className='mt-2 text-sm text-red-300'>
                {fileError}
              </p>
            )}
            {reference && (
              <div className='mt-3 flex items-center gap-3'>
                <img
                  src={reference.preview}
                  alt={t('Reference image preview')}
                  className='size-20 rounded-lg object-contain'
                />
                <span className='min-w-0 flex-1 truncate text-xs text-slate-400'>
                  {reference.file.name}
                </span>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  disabled={busy}
                  aria-label={t('Remove reference image')}
                  onClick={() => {
                    fileVersion.current++
                    setReference(null)
                    setGroup(user ? (user.group ?? 'default') : '')
                    setGroupChosen(!user)
                    setModelName('')
                    generation.reset()
                  }}
                >
                  <X aria-hidden='true' />
                </Button>
              </div>
            )}
          </div>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div className='max-w-xl space-y-1 text-xs text-slate-400'>
              <p>
                {price && !largeResolution
                  ? t('Catalog price: {{price}} per request', { price })
                  : t('Price depends on the selected model and actual usage.')}
              </p>
              <p>
                {t(
                  'One image per request. Actual server settlement applies; dimensions may affect the final charge.'
                )}
              </p>
            </div>
            <Button
              type='submit'
              disabled={
                busy ||
                !form.watch('prompt').trim() ||
                (Boolean(user) &&
                  (!selectionValid ||
                    !resolutionAllowed ||
                    selfGroups.isFetching ||
                    pricing.isFetching))
              }
            >
              <Sparkles aria-hidden='true' />
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
      {pricing.isError ||
      (user && (selfGroups.isError || userModels.isError)) ? (
        <ErrorState
          title={t('Image catalog unavailable')}
          description={t(
            'Your prompt is saved. Reload the catalog to check available models.'
          )}
          onRetry={() => {
            void pricing.refetch()
            if (user) {
              void selfGroups.refetch()
              if (selectedGroup) void userModels.refetch()
            }
          }}
        />
      ) : (
        !pricing.isPending &&
        !selfGroups.isFetching &&
        !catalog.models.length && (
          <EmptyState
            icon={ImagePlus}
            title={
              reference
                ? t('No image editing models available')
                : t('No image generation models available')
            }
            description={emptyDescription}
            className='min-h-40'
          />
        )
      )}
      {generation.isError && (
        <p role='alert' className='text-sm text-red-300'>
          {getServerErrorMessage(
            generation.error,
            t('Image generation failed.')
          )}
        </p>
      )}
      {generation.isPending && (
        <p role='status' className='text-sm text-slate-400'>
          {t(
            'Creating your image. Paid requests are not retried automatically.'
          )}
        </p>
      )}
      <ImageGallery images={images} onOpenCanvas={props.onOpenCanvas} />
      <WorkbenchAuthGate
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo='/canvas'
      />
    </section>
  )
}
